"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { auth } from "@/auth";
import type { Role } from "@/lib/auth/schema";
import { db } from "@/lib/db";
import { auditLogs, customOrders, users } from "@/lib/db/schema";
import { formatCurrency } from "@/lib/format";
import { sendMail } from "@/lib/mail";
import { CUSTOM_ORDER_ALLOWED_EXTENSIONS, createCustomOrderSchema, quoteCustomOrderSchema } from "./schema";

const STAFF_ROLES: Role[] = ["admin", "empleado"];

async function requireUser() {
  const session = await auth();
  if (!session) throw new Error("Debes iniciar sesion.");
  return session;
}

async function requireStaff() {
  const session = await auth();
  if (!session || !STAFF_ROLES.includes(session.user.role)) {
    throw new Error("No autorizado.");
  }
  return session;
}

async function logAudit(params: {
  userId: string;
  storeId: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
}) {
  await db.insert(auditLogs).values({
    storeId: params.storeId,
    userId: params.userId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    before: params.before ?? null,
    after: params.after ?? null,
  });
}

export async function createCustomOrder(input: z.infer<typeof createCustomOrderSchema>, file: File) {
  const session = await requireUser();
  const data = createCustomOrderSchema.parse(input);

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!CUSTOM_ORDER_ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`Extension no permitida. Usa: ${CUSTOM_ORDER_ALLOWED_EXTENSIONS.join(", ")}.`);
  }

  const maxSizeMb = Number(process.env.UPLOADS_MAX_SIZE_MB ?? 20);
  if (file.size > maxSizeMb * 1024 * 1024) {
    throw new Error(`El archivo supera el tamano maximo permitido (${maxSizeMb} MB).`);
  }

  const uploadsDir = process.env.UPLOADS_DIR ?? "./public/uploads";
  const customOrdersDir = path.resolve(uploadsDir, "custom-orders");
  await mkdir(customOrdersDir, { recursive: true });

  // Nombre generado server-side (nunca el original del cliente) para evitar
  // path traversal y colisiones, mismo criterio que uploadProductImage en
  // catalog/actions.ts. El nombre original se guarda aparte solo para mostrar.
  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(customOrdersDir, filename), buffer);

  const [created] = await db
    .insert(customOrders)
    .values({
      storeId: session.user.storeId,
      userId: session.user.id,
      fileUrl: `/uploads/custom-orders/${filename}`,
      fileName: file.name.slice(0, 255),
      material: data.material,
      color: data.color,
      quantity: data.quantity,
      approxSize: data.approxSize,
      notes: data.notes,
    })
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "create",
    entityType: "custom_order",
    entityId: created.id,
    after: created,
  });

  revalidatePath("/mi-cuenta/pedidos");
  revalidatePath("/admin/pedidos-custom");
  return created;
}

// Lectura scoped al usuario logueado (no hay lectura publica de pedidos a
// medida), asi que vive junto a las mutaciones guardadas de este archivo,
// mismo criterio que getCartItems en cart/actions.ts.
export async function getMyCustomOrders() {
  const session = await requireUser();

  return db
    .select()
    .from(customOrders)
    .where(eq(customOrders.userId, session.user.id))
    .orderBy(desc(customOrders.createdAt));
}

export type CustomOrderRow = Awaited<ReturnType<typeof getMyCustomOrders>>[number];

// Lectura para el panel admin: pendientes + cotizados de la tienda del staff
// logueado. La pagina original solo traia "pendiente" directo con un select
// suelto (sin filtrar storeId); esto lo reemplaza siguiendo el mismo patron
// guardado que el resto de las lecturas de admin (listProductsForAdmin, etc).
export async function listCustomOrdersForAdmin() {
  const session = await requireStaff();

  return db
    .select()
    .from(customOrders)
    .where(
      and(
        eq(customOrders.storeId, session.user.storeId),
        inArray(customOrders.status, ["pendiente", "cotizado"]),
      ),
    )
    .orderBy(desc(customOrders.createdAt));
}

export async function quoteCustomOrder(id: string, input: z.infer<typeof quoteCustomOrderSchema>) {
  const session = await requireStaff();
  const data = quoteCustomOrderSchema.parse(input);

  const [existing] = await db
    .select()
    .from(customOrders)
    .where(and(eq(customOrders.id, id), eq(customOrders.storeId, session.user.storeId)))
    .limit(1);
  if (!existing) throw new Error("Pedido a medida no encontrado.");

  // Solo se cotiza una vez desde "pendiente": evita pisar una cotizacion ya
  // hecha (o peor, una orden que ya esta pagada) con un click de mas.
  if (existing.status !== "pendiente") {
    throw new Error(`Este pedido ya esta en estado "${existing.status}", no se puede volver a cotizar.`);
  }

  const [updated] = await db
    .update(customOrders)
    .set({
      quotedPrice: data.quotedPrice.toFixed(2),
      quotedNotes: data.quotedNotes,
      quotedAt: new Date(),
      status: "cotizado",
    })
    .where(eq(customOrders.id, id))
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "quote",
    entityType: "custom_order",
    entityId: id,
    before: existing,
    after: updated,
  });

  revalidatePath("/mi-cuenta/pedidos");
  revalidatePath("/admin/pedidos-custom");

  // El mail es un efecto secundario: la cotizacion ya quedo guardada en la
  // DB arriba, asi que si el envio falla (SMTP no configurado, error de
  // conexion, lo que sea) no revierte ni bloquea la operacion — solo se
  // informa en el resultado para que el admin lo sepa.
  let emailSent = false;
  try {
    const [customer] = await db.select({ email: users.email }).from(users).where(eq(users.id, existing.userId)).limit(1);

    if (customer) {
      const lines = [
        `Tu pedido a medida ("${updated.fileName}") ya tiene una cotizacion lista.`,
        `Precio: ${formatCurrency(Number(updated.quotedPrice))}`,
        updated.quotedNotes ? `Notas: ${updated.quotedNotes}` : null,
        "Podes verlo en tu cuenta: /mi-cuenta/pedidos",
      ].filter((line): line is string => Boolean(line));

      const result = await sendMail({
        storeId: session.user.storeId,
        to: customer.email,
        subject: "Tu cotizacion esta lista",
        text: lines.join("\n\n"),
      });
      emailSent = result.status === "sent";
    }
  } catch {
    emailSent = false;
  }

  return { ...updated, emailSent };
}

// Mercado Pago queda afuera por ahora (decision del owner). Esta funcion ya
// deja la validacion real hecha (ownership + estado "cotizado") para que el
// frontend del boton "Pagar" tenga contra que conectar sin bloquear en que
// el pago todavia no esta disponible.
export async function initiateCustomOrderPayment(id: string) {
  const session = await requireUser();

  const [existing] = await db
    .select()
    .from(customOrders)
    .where(and(eq(customOrders.id, id), eq(customOrders.userId, session.user.id)))
    .limit(1);
  if (!existing) throw new Error("Pedido a medida no encontrado.");

  if (existing.status !== "cotizado") {
    throw new Error("Este pedido todavia no tiene una cotizacion lista para pagar.");
  }

  // TODO: conectar Mercado Pago cuando se retome esa integracion — crear
  // "orders" + "order_items" con source "pedido_custom" (customOrderId =
  // existing.id) y llamar createPreference, igual que el Paso 3 del catalogo.
  throw new Error("Pago no disponible todavia.");
}
