"use server";

import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import type { Role } from "@/lib/auth/schema";
import { db } from "@/lib/db";
import { auditLogs, cartItems, orderItems, orders, stores, users } from "@/lib/db/schema";
import { getCartItems } from "@/lib/cart/actions";
import { createPreference } from "@/lib/mercadopago/client";
import { markOrderAsPaid } from "@/lib/orders/mark-paid";
import { sendMail } from "@/lib/mail";
import { formatCurrency } from "@/lib/format";

const STAFF_ROLES: Role[] = ["admin", "empleado"];

async function requireStaff() {
  const session = await auth();
  if (!session || !STAFF_ROLES.includes(session.user.role)) {
    throw new Error("No autorizado.");
  }
  return session;
}

export type ManualPaymentMethod = "transferencia" | "abitab" | "redpagos";
export type PaymentMethod = "mercado_pago" | ManualPaymentMethod;

const MANUAL_METHOD_LABELS: Record<ManualPaymentMethod, string> = {
  transferencia: "Transferencia bancaria",
  abitab: "Abitab",
  redpagos: "Red Pagos",
};

// Publico (no admin-gated a proposito): el checkout necesita saber que
// medios de pago manuales estan configurados (tienen instrucciones
// cargadas en /admin/configuracion) para poder ofrecerlos como opcion.
// Mercado Pago no aparece aca — el checkout lo ofrece siempre, sin
// depender de esta lista.
export async function getAvailableManualPaymentMethods(storeId: string) {
  const [store] = await db
    .select({
      paymentInstructionsTransferencia: stores.paymentInstructionsTransferencia,
      paymentInstructionsAbitab: stores.paymentInstructionsAbitab,
      paymentInstructionsRedpagos: stores.paymentInstructionsRedpagos,
    })
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1);

  const methods: { value: ManualPaymentMethod; label: string; instructions: string }[] = [];
  if (store?.paymentInstructionsTransferencia) {
    methods.push({
      value: "transferencia",
      label: MANUAL_METHOD_LABELS.transferencia,
      instructions: store.paymentInstructionsTransferencia,
    });
  }
  if (store?.paymentInstructionsAbitab) {
    methods.push({ value: "abitab", label: MANUAL_METHOD_LABELS.abitab, instructions: store.paymentInstructionsAbitab });
  }
  if (store?.paymentInstructionsRedpagos) {
    methods.push({
      value: "redpagos",
      label: MANUAL_METHOD_LABELS.redpagos,
      instructions: store.paymentInstructionsRedpagos,
    });
  }
  return methods;
}

// Mail con las instrucciones de pago + numero de orden para que el cliente
// sepa que transferir/pagar y donde. Nunca bloquea la creacion de la orden
// si el envio falla (mismo criterio de resiliencia que quoteCustomOrder en
// custom-orders/actions.ts) — la orden de servicio ya quedo guardada en la
// DB antes de intentar mandar el mail.
async function sendManualPaymentInstructions(params: {
  storeId: string;
  to: string;
  orderNumber: number;
  total: string;
  methodLabel: string;
  instructions: string;
}) {
  try {
    await sendMail({
      storeId: params.storeId,
      to: params.to,
      subject: `Orden de servicio #${params.orderNumber} — instrucciones de pago`,
      text: [
        `Tu orden de servicio #${params.orderNumber} quedo registrada por ${formatCurrency(Number(params.total))}.`,
        `Medio de pago elegido: ${params.methodLabel}.`,
        "",
        params.instructions,
        "",
        "En cuanto confirmemos que el pago llego, vas a ver la orden actualizada en tu cuenta (/mi-cuenta/pedidos).",
      ].join("\n"),
    });
  } catch {
    // No se loguea el error real ni se relanza: un mail que falla no puede
    // tirar abajo la creacion de la orden, que ya esta guardada.
  }
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

// Paso 3 de docs/spec-ecommerce-base.md, extendido con medios de pago
// manuales: crea la orden + order_items a partir del carrito real del
// server (nunca del total que muestre el cliente).
//
// Con "mercado_pago" (default): genera la preferencia y devuelve el link de
// pago (init_point) para que el cliente redirija con window.location.assign.
// El pago se confirma solo por el webhook, esto deja la orden en
// "pendiente_pago".
//
// Con un medio manual (transferencia/abitab/redpagos): no hay integracion
// de pago real — la orden ("orden de servicio") queda en
// "pendiente_confirmacion", se le manda un mail al cliente con las
// instrucciones + numero de orden, y un admin la confirma a mano desde
// /admin/pedidos cuando verifica que el dinero llego (ver
// confirmManualPayment mas abajo).
export async function checkoutCart(paymentMethod: PaymentMethod = "mercado_pago") {
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

  let manualMethod: { value: ManualPaymentMethod; label: string; instructions: string } | undefined;
  if (paymentMethod !== "mercado_pago") {
    const available = await getAvailableManualPaymentMethods(session.user.storeId);
    manualMethod = available.find((method) => method.value === paymentMethod);
    // Defensa en profundidad: no confiar en que el cliente solo mande un
    // valor que la UI le ofrecio — si ese medio no tiene instrucciones
    // cargadas, no se puede generar la orden de servicio.
    if (!manualMethod) throw new Error("Ese medio de pago no esta disponible.");
  }

  const [order] = await db
    .insert(orders)
    .values({
      storeId: session.user.storeId,
      userId: session.user.id,
      source: "catalogo",
      status: manualMethod ? "pendiente_confirmacion" : "pendiente_pago",
      paymentMethod,
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

  // El carrito se vacia en los dos casos: la orden ya tiene su propio
  // snapshot en order_items, y dejar el carrito intacto permitiria
  // clickear "Ir a pagar" de nuevo y generar ordenes duplicadas.
  await db.delete(cartItems).where(eq(cartItems.userId, session.user.id));
  revalidatePath("/carrito");

  if (manualMethod) {
    if (session.user.email) {
      await sendManualPaymentInstructions({
        storeId: session.user.storeId,
        to: session.user.email,
        orderNumber: order.orderNumber,
        total: order.total,
        methodLabel: manualMethod.label,
        instructions: manualMethod.instructions,
      });
    }

    return {
      type: "manual" as const,
      orderNumber: order.orderNumber,
      methodLabel: manualMethod.label,
      instructions: manualMethod.instructions,
    };
  }

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

  return { type: "mercado_pago" as const, initPoint };
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

// Confirmacion manual de una orden de servicio (medio de pago transferencia
// /abitab/redpagos): el admin la usa cuando verifico que el dinero
// efectivamente llego. Usa markOrderAsPaid — mismo helper que el webhook de
// Mercado Pago — asi que descuenta stock / marca el pedido a medida como
// pagado / escribe audit_logs exactamente igual que un pago automatico.
export async function confirmManualPayment(id: string) {
  const session = await requireStaff();

  const [existing] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.storeId, session.user.storeId)))
    .limit(1);
  if (!existing) throw new Error("Orden no encontrada.");

  if (existing.status !== "pendiente_confirmacion") {
    throw new Error(`Esta orden esta en estado "${existing.status}", no hay un pago manual que confirmar.`);
  }

  const updated = await markOrderAsPaid({ orderId: id, actorUserId: session.user.id });

  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/dashboard");

  return updated;
}
