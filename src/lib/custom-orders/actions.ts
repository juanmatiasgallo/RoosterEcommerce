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
import { auditLogs, customOrders, orderItems, orders, users } from "@/lib/db/schema";
import { formatCurrency } from "@/lib/format";
import { sendMail } from "@/lib/mail";
import { createPreference } from "@/lib/mercadopago/client";
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

// Paso 4 de docs/spec-ecommerce-base.md: crea (o reutiliza) la orden
// source="pedido_custom" ligada a esta cotizacion, genera la preferencia de
// Mercado Pago y devuelve el link de pago. Mismo patron que checkoutCart en
// src/lib/orders/actions.ts: el pago en si se confirma solo por webhook.
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
  if (!existing.quotedPrice) {
    throw new Error("Este pedido no tiene un precio cotizado valido.");
  }

  // Si el cliente ya habia clickeado "Pagar" antes sin completar el pago,
  // reutiliza esa misma orden "pendiente_pago" en vez de crear una nueva
  // cada vez (evita acumular ordenes duplicadas por el mismo pedido).
  const [existingOrder] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.customOrderId, existing.id), eq(orders.status, "pendiente_pago")))
    .limit(1);

  const itemTitle = `Pedido a medida: ${existing.fileName}`;

  const order =
    existingOrder ??
    (
      await db
        .insert(orders)
        .values({
          storeId: session.user.storeId,
          userId: session.user.id,
          source: "pedido_custom",
          customOrderId: existing.id,
          status: "pendiente_pago",
          total: existing.quotedPrice,
        })
        .returning()
    )[0];

  if (!existingOrder) {
    // quotedPrice es el precio total ya cotizado por el admin para todo el
    // pedido (no un precio unitario) — por eso quantity: 1 aca, aunque
    // existing.quantity sea otro numero (esa es la cantidad de piezas que
    // ya quedo reflejada en el precio cotizado).
    await db.insert(orderItems).values({
      orderId: order.id,
      variantId: null,
      productName: itemTitle,
      variantLabel: [existing.material, existing.color, existing.approxSize].filter(Boolean).join(" ") || null,
      unitPrice: existing.quotedPrice,
      quantity: 1,
    });

    await logAudit({
      userId: session.user.id,
      storeId: session.user.storeId,
      action: "create",
      entityType: "order",
      entityId: order.id,
      after: order,
    });
  }

  const preference = await createPreference({
    orderId: order.id,
    storeId: session.user.storeId,
    items: [{ title: itemTitle, quantity: 1, unitPrice: Number(existing.quotedPrice) }],
    payerEmail: session.user.email ?? undefined,
  });

  const initPoint = preference.init_point ?? preference.sandbox_init_point;
  if (!initPoint) throw new Error("No se pudo generar el link de pago.");

  await db.update(orders).set({ mpPreferenceId: preference.id }).where(eq(orders.id, order.id));

  return { initPoint };
}
