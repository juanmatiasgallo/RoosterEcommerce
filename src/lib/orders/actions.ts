"use server";

import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import type { Role } from "@/lib/auth/schema";
import { db } from "@/lib/db";
import { auditLogs, cartItems, orderItems, orders, users } from "@/lib/db/schema";
import { getCartItems } from "@/lib/cart/actions";
import { createPreference } from "@/lib/mercadopago/client";

const STAFF_ROLES: Role[] = ["admin", "empleado"];

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

// Paso 3 de docs/spec-ecommerce-base.md: crea la orden + order_items a
// partir del carrito real del server (nunca del total que muestre el
// cliente), genera la preferencia de Mercado Pago, y devuelve el link de
// pago para que el cliente redirija con window.location.assign. El pago en
// si se confirma solo por el webhook (src/app/api/webhooks/mercadopago/route.ts),
// esto solo deja la orden en "pendiente_pago".
export async function checkoutCart() {
  const session = await auth();
  if (!session) throw new Error("Debes iniciar sesion para pagar.");

  const { items, total } = await getCartItems();
  if (items.length === 0) throw new Error("Tu carrito esta vacio.");

  // Revalida stock al momento de pagar: puede haber cambiado desde que se
  // agrego al carrito (mismo criterio que addToCart/updateCartItem).
  for (const row of items) {
    if (row.item.quantity > row.variant.stock) {
      throw new Error(`"${row.product.name}" ya no tiene stock suficiente (quedan ${row.variant.stock}).`);
    }
  }

  const [order] = await db
    .insert(orders)
    .values({
      storeId: session.user.storeId,
      userId: session.user.id,
      source: "catalogo",
      status: "pendiente_pago",
      total: total.toFixed(2),
    })
    .returning();

  await db.insert(orderItems).values(
    items.map((row) => ({
      orderId: order.id,
      variantId: row.variant.id,
      productName: row.product.name,
      variantLabel: [row.variant.material, row.variant.color, row.variant.size].filter(Boolean).join(" ") || null,
      unitPrice: row.variant.price,
      quantity: row.item.quantity,
    })),
  );

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "create",
    entityType: "order",
    entityId: order.id,
    after: order,
  });

  const preference = await createPreference({
    orderId: order.id,
    storeId: session.user.storeId,
    items: items.map((row) => ({
      title: row.product.name,
      quantity: row.item.quantity,
      unitPrice: Number(row.variant.price),
    })),
    payerEmail: session.user.email ?? undefined,
  });

  const initPoint = preference.init_point ?? preference.sandbox_init_point;
  if (!initPoint) throw new Error("No se pudo generar el link de pago.");

  await db.update(orders).set({ mpPreferenceId: preference.id }).where(eq(orders.id, order.id));

  // El carrito se vacia aca: la orden ya tiene su propio snapshot en
  // order_items, y dejar el carrito intacto permitiria clickear "Ir a
  // pagar" de nuevo y generar ordenes "pendiente_pago" duplicadas por cada
  // intento. El stock recien se descuenta cuando el webhook confirma el
  // pago, no antes.
  await db.delete(cartItems).where(eq(cartItems.userId, session.user.id));
  revalidatePath("/carrito");

  return { initPoint };
}

// Paso 6 de docs/spec-ecommerce-base.md: cola de ordenes que ya tienen algo
// que gestionar (pagadas en adelante). Las "pendiente_pago" son intentos de
// checkout sin confirmar todavia — no hay nada que un admin pueda hacer con
// esas, asi que se excluyen.
export async function listOrdersForAdmin() {
  const session = await requireStaff();

  const orderRows = await db
    .select({ order: orders, customerName: users.name, customerEmail: users.email })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .where(and(eq(orders.storeId, session.user.storeId), ne(orders.status, "pendiente_pago")))
    .orderBy(desc(orders.createdAt));

  if (orderRows.length === 0) return [];

  const itemRows = await db
    .select()
    .from(orderItems)
    .where(
      inArray(
        orderItems.orderId,
        orderRows.map((row) => row.order.id),
      ),
    );

  const itemsByOrder = new Map<string, typeof itemRows>();
  for (const item of itemRows) {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push(item);
    itemsByOrder.set(item.orderId, list);
  }

  return orderRows.map((row) => ({ ...row, items: itemsByOrder.get(row.order.id) ?? [] }));
}

export type AdminOrderRow = Awaited<ReturnType<typeof listOrdersForAdmin>>[number];

type OrderStatus = typeof orders.$inferSelect.status;

// Camino feliz explicito, sin saltos: "pagado" -> "en_preparacion" ->
// "enviado" -> "entregado". "cancelado" es terminal y no se maneja aca
// (ver Paso 5: solo el webhook toca el estado de una orden no aprobada).
const ORDER_STATUS_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus>> = {
  pagado: "en_preparacion",
  en_preparacion: "enviado",
  enviado: "entregado",
};

export async function updateOrderStatus(id: string, nextStatus: "en_preparacion" | "enviado" | "entregado") {
  const session = await requireStaff();

  const [existing] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.storeId, session.user.storeId)))
    .limit(1);
  if (!existing) throw new Error("Orden no encontrada.");

  if (ORDER_STATUS_TRANSITIONS[existing.status] !== nextStatus) {
    throw new Error(`No se puede pasar de "${existing.status}" a "${nextStatus}".`);
  }

  const [updated] = await db.update(orders).set({ status: nextStatus }).where(eq(orders.id, id)).returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "update_status",
    entityType: "order",
    entityId: id,
    before: { status: existing.status },
    after: { status: nextStatus },
  });

  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/dashboard");

  return updated;
}
