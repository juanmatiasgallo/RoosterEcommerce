"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { auditLogs, cartItems, orderItems, orders } from "@/lib/db/schema";
import { getCartItems } from "@/lib/cart/actions";
import { createPreference } from "@/lib/mercadopago/client";

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
