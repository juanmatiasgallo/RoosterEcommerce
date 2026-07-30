"use server";

import { and, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { auth } from "@/auth";
import type { Role } from "@/lib/auth/schema";
import { db } from "@/lib/db";
import { productInquiries, productInquiryMessages, products, users } from "@/lib/db/schema";
import { notify, notifyStaff } from "@/lib/notifications/notify";
import { askProductQuestionSchema, replyInquirySchema } from "./schema";

const STAFF_ROLES: Role[] = ["admin", "empleado"];

async function requireStaff() {
  const session = await auth();
  if (!session || !STAFF_ROLES.includes(session.user.role)) {
    throw new Error("No autorizado.");
  }
  return session;
}

async function requireCliente() {
  const session = await auth();
  if (!session) throw new Error("Debes iniciar sesion.");
  if (session.user.role !== "cliente") {
    throw new Error("Esta funcion es solo para clientes.");
  }
  return session;
}

// Encuentra el hilo (producto, cliente) o lo crea si es la primera vez que
// este cliente pregunta algo sobre este producto -- mismo hilo para
// cualquier mensaje de seguimiento, no se duplican hilos por producto.
async function getOrCreateInquiry(storeId: string, productId: string, customerId: string) {
  const [existing] = await db
    .select()
    .from(productInquiries)
    .where(and(eq(productInquiries.productId, productId), eq(productInquiries.customerId, customerId)))
    .limit(1);
  if (existing) return existing;

  const [created] = await db.insert(productInquiries).values({ storeId, productId, customerId }).returning();
  return created;
}

// Un solo endpoint para el cliente, tanto para la primera pregunta como
// para cualquier mensaje de seguimiento en el mismo hilo (task #46: "un
// chat con varios mensajes" en vez de pregunta/respuesta unica) -- si ya
// existe un hilo para ese producto+cliente, este mensaje se suma ahi.
export async function sendProductQuestion(input: z.infer<typeof askProductQuestionSchema>) {
  const session = await requireCliente();
  const data = askProductQuestionSchema.parse(input);

  const [product] = await db
    .select({ id: products.id, name: products.name, storeId: products.storeId, slug: products.slug })
    .from(products)
    .where(eq(products.id, data.productId))
    .limit(1);
  if (!product) throw new Error("Producto no encontrado.");

  const inquiry = await getOrCreateInquiry(product.storeId, product.id, session.user.id);

  const [message] = await db
    .insert(productInquiryMessages)
    .values({ inquiryId: inquiry.id, senderId: session.user.id, senderRole: "cliente", body: data.message })
    .returning();

  await db.update(productInquiries).set({ lastMessageAt: message.createdAt }).where(eq(productInquiries.id, inquiry.id));

  await notifyStaff({
    storeId: product.storeId,
    type: "product_question",
    title: `Nueva pregunta sobre "${product.name}"`,
    body: data.message.slice(0, 140),
    link: "/admin/preguntas",
  });

  revalidatePath(`/producto/${product.slug}`);
  revalidatePath("/mi-cuenta/preguntas");
  revalidatePath("/admin/preguntas");

  return { inquiryId: inquiry.id };
}

export async function replyProductInquiry(input: z.infer<typeof replyInquirySchema>) {
  const session = await requireStaff();
  const data = replyInquirySchema.parse(input);

  const [inquiry] = await db
    .select()
    .from(productInquiries)
    .where(and(eq(productInquiries.id, data.inquiryId), eq(productInquiries.storeId, session.user.storeId)))
    .limit(1);
  if (!inquiry) throw new Error("Consulta no encontrada.");

  const [product] = await db
    .select({ name: products.name, slug: products.slug })
    .from(products)
    .where(eq(products.id, inquiry.productId))
    .limit(1);

  const [message] = await db
    .insert(productInquiryMessages)
    .values({ inquiryId: inquiry.id, senderId: session.user.id, senderRole: "empleado", body: data.message })
    .returning();

  await db.update(productInquiries).set({ lastMessageAt: message.createdAt }).where(eq(productInquiries.id, inquiry.id));

  await notify({
    storeId: session.user.storeId,
    recipientUserId: inquiry.customerId,
    type: "product_question_reply",
    title: `Te respondieron sobre "${product?.name ?? "un producto"}"`,
    body: data.message.slice(0, 140),
    link: "/mi-cuenta/preguntas",
  });

  if (product) revalidatePath(`/producto/${product.slug}`);
  revalidatePath("/mi-cuenta/preguntas");
  revalidatePath("/admin/preguntas");

  return message;
}

// Hilo del producto puntual para el cliente logueado actual -- null si
// todavia no pregunto nada sobre este producto (la UI muestra el form de
// "primera pregunta" en ese caso).
export async function getMyInquiryForProduct(productId: string) {
  const session = await auth();
  if (!session || session.user.role !== "cliente") return null;

  const [inquiry] = await db
    .select()
    .from(productInquiries)
    .where(and(eq(productInquiries.productId, productId), eq(productInquiries.customerId, session.user.id)))
    .limit(1);
  if (!inquiry) return null;

  const messages = await db
    .select()
    .from(productInquiryMessages)
    .where(eq(productInquiryMessages.inquiryId, inquiry.id))
    .orderBy(productInquiryMessages.createdAt);

  return { inquiry, messages };
}

// "Mis preguntas" (task #46): todos los hilos del cliente logueado, de
// cualquier producto, ordenados por actividad reciente.
export async function getMyInquiries() {
  const session = await auth();
  if (!session) throw new Error("Debes iniciar sesion.");

  const rows = await db
    .select({ inquiry: productInquiries, productName: products.name, productSlug: products.slug })
    .from(productInquiries)
    .innerJoin(products, eq(products.id, productInquiries.productId))
    .where(eq(productInquiries.customerId, session.user.id))
    .orderBy(desc(productInquiries.lastMessageAt));

  if (rows.length === 0) return [];

  const messageRows = await db
    .select()
    .from(productInquiryMessages)
    .where(inArray(productInquiryMessages.inquiryId, rows.map((row) => row.inquiry.id)))
    .orderBy(productInquiryMessages.createdAt);

  // Ultimo mensaje de cada hilo (para la preview en la lista) -- las filas
  // ya vienen ordenadas por createdAt asc, asi que la ultima que quede en
  // el mapa por inquiryId es la mas reciente.
  const lastMessageByInquiry = new Map<string, (typeof messageRows)[number]>();
  for (const message of messageRows) {
    lastMessageByInquiry.set(message.inquiryId, message);
  }

  return rows.map((row) => ({ ...row, lastMessage: lastMessageByInquiry.get(row.inquiry.id) ?? null }));
}

export type MyInquiryRow = Awaited<ReturnType<typeof getMyInquiries>>[number];

// Panel admin (task #46): todos los hilos de la tienda, mas recientes
// primero, con el nombre del producto y del cliente para la lista.
export async function listInquiriesForAdmin() {
  const session = await requireStaff();

  return db
    .select({
      inquiry: productInquiries,
      productName: products.name,
      productSlug: products.slug,
      customerName: users.name,
      customerEmail: users.email,
    })
    .from(productInquiries)
    .innerJoin(products, eq(products.id, productInquiries.productId))
    .innerJoin(users, eq(users.id, productInquiries.customerId))
    .where(eq(productInquiries.storeId, session.user.storeId))
    .orderBy(desc(productInquiries.lastMessageAt));
}

export type AdminInquiryRow = Awaited<ReturnType<typeof listInquiriesForAdmin>>[number];

export async function getInquiryMessagesForAdmin(inquiryId: string) {
  const session = await requireStaff();

  const [inquiry] = await db
    .select()
    .from(productInquiries)
    .where(and(eq(productInquiries.id, inquiryId), eq(productInquiries.storeId, session.user.storeId)))
    .limit(1);
  if (!inquiry) throw new Error("Consulta no encontrada.");

  return db
    .select()
    .from(productInquiryMessages)
    .where(eq(productInquiryMessages.inquiryId, inquiryId))
    .orderBy(productInquiryMessages.createdAt);
}
