"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import type { Role } from "@/lib/auth/schema";
import { db } from "@/lib/db";
import { auditLogs, cartItems, orderItems, orders, shippingZones, stores, users } from "@/lib/db/schema";
import { getCartItems } from "@/lib/cart/actions";
import { createPreference } from "@/lib/mercadopago/client";
import { markOrderAsPaid } from "@/lib/orders/mark-paid";
import { shippingAddressSchema, type ShippingAddress } from "@/lib/orders/schema";
import { notify, notifyStaff } from "@/lib/notifications/notify";
import { sendMail } from "@/lib/mail";
import { formatCurrency } from "@/lib/format";
import { getVacationStatus } from "@/lib/settings/actions";

const STAFF_ROLES: Role[] = ["admin", "empleado"];

async function requireStaff() {
  const session = await auth();
  if (!session || !STAFF_ROLES.includes(session.user.role)) {
    throw new Error("No autorizado.");
  }
  return session;
}

export type ManualPaymentMethod = "transferencia" | "abitab" | "redpagos" | "mi_dinero" | "prex" | "contra_entrega";
export type PaymentMethod = "mercado_pago" | ManualPaymentMethod;

const MANUAL_METHOD_LABELS: Record<ManualPaymentMethod, string> = {
  transferencia: "Transferencia bancaria",
  abitab: "Abitab",
  redpagos: "Red Pagos",
  mi_dinero: "Debito Mi Dinero",
  prex: "Prex",
  contra_entrega: "Pago contra entrega",
};

// Una entrada por medio manual: que columna de `stores` tiene sus
// instrucciones. Agregar un medio nuevo es sumar una fila aca + la columna
// en schema.ts + el campo en el form de /admin/configuracion.
const MANUAL_METHOD_COLUMNS = {
  transferencia: "paymentInstructionsTransferencia",
  abitab: "paymentInstructionsAbitab",
  redpagos: "paymentInstructionsRedpagos",
  mi_dinero: "paymentInstructionsMiDinero",
  prex: "paymentInstructionsPrex",
  contra_entrega: "paymentInstructionsContraentrega",
} as const satisfies Record<ManualPaymentMethod, keyof typeof stores.$inferSelect>;

// Los medios que involucran plata que el cliente ya mando (no contra
// entrega) son los unicos donde tiene sentido pedir/subir un comprobante.
const RECEIPT_ELIGIBLE_METHODS: ManualPaymentMethod[] = ["transferencia", "abitab", "redpagos", "mi_dinero", "prex"];

// Publico (no admin-gated a proposito): el checkout necesita saber que
// medios de pago manuales estan configurados (tienen instrucciones
// cargadas en /admin/configuracion) para poder ofrecerlos como opcion.
// Mercado Pago no aparece aca — el checkout lo ofrece siempre, sin
// depender de esta lista.
export async function getAvailableManualPaymentMethods(storeId: string) {
  const [store] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
  if (!store) return [];

  const methods: { value: ManualPaymentMethod; label: string; instructions: string }[] = [];
  for (const [method, column] of Object.entries(MANUAL_METHOD_COLUMNS) as [ManualPaymentMethod, keyof typeof store][]) {
    const instructions = store[column];
    if (typeof instructions === "string" && instructions) {
      methods.push({ value: method, label: MANUAL_METHOD_LABELS[method], instructions });
    }
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

// Aviso al admin cuando entra una orden de servicio nueva (medio manual):
// va al contactEmail de /admin/configuracion, o al smtpFromEmail si todavia
// no cargaron uno. Mismo criterio de resiliencia que sendManualPaymentInstructions
// de arriba — nunca bloquea la creacion de la orden.
async function sendManualPaymentAdminNotification(params: {
  storeId: string;
  orderNumber: number;
  total: string;
  methodLabel: string;
  customerEmail: string;
}) {
  try {
    const [store] = await db
      .select({ contactEmail: stores.contactEmail, smtpFromEmail: stores.smtpFromEmail })
      .from(stores)
      .where(eq(stores.id, params.storeId))
      .limit(1);
    const to = store?.contactEmail || store?.smtpFromEmail;
    if (!to) return;

    await sendMail({
      storeId: params.storeId,
      to,
      subject: `Nueva orden de servicio #${params.orderNumber}`,
      text: [
        `Se genero una orden de servicio nueva #${params.orderNumber} por ${formatCurrency(Number(params.total))}.`,
        `Medio de pago elegido: ${params.methodLabel}.`,
        `Cliente: ${params.customerEmail}.`,
        "",
        "Confirmala cuando verifiques que el pago llego, desde /admin/pedidos.",
      ].join("\n"),
    });
  } catch {
    // No se relanza: un mail que falla no puede tirar abajo la orden.
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
export async function checkoutCart(params: {
  paymentMethod: PaymentMethod;
  shippingZoneId?: string;
  shippingAddress?: ShippingAddress;
}) {
  const session = await auth();
  if (!session) throw new Error("Debes iniciar sesion para pagar.");

  const vacation = await getVacationStatus();
  if (vacation.vacationMode) {
    throw new Error(vacation.vacationMessage || "La tienda no esta recibiendo pedidos en este momento.");
  }

  const { items, total } = await getCartItems();
  if (items.length === 0) throw new Error("Tu carrito esta vacio.");

  // Revalida stock al momento de pagar: puede haber cambiado desde que se
  // agrego al carrito (mismo criterio que addToCart/updateCartItem).
  for (const row of items) {
    if (row.item.quantity > row.variant.stock) {
      throw new Error(`"${row.product.name}" ya no tiene stock suficiente (quedan ${row.variant.stock}).`);
    }
  }

  const paymentMethod = params.paymentMethod;

  let manualMethod: { value: ManualPaymentMethod; label: string; instructions: string } | undefined;
  if (paymentMethod !== "mercado_pago") {
    const available = await getAvailableManualPaymentMethods(session.user.storeId);
    manualMethod = available.find((method) => method.value === paymentMethod);
    // Defensa en profundidad: no confiar en que el cliente solo mande un
    // valor que la UI le ofrecio — si ese medio no tiene instrucciones
    // cargadas, no se puede generar la orden de servicio.
    if (!manualMethod) throw new Error("Ese medio de pago no esta disponible.");
  }

  // Zona de envio (opcional): si se manda un id, tiene que existir, estar
  // activa y pertenecer a esta tienda — nunca se confia en un costo que
  // pudiera mandar el cliente. Sin zona elegida, el envio queda en 0 (se
  // coordina aparte, mismo criterio que antes de que existiera este paso).
  let shippingZone: { id: string; name: string; cost: string } | undefined;
  if (params.shippingZoneId) {
    const [zone] = await db
      .select({ id: shippingZones.id, name: shippingZones.name, cost: shippingZones.cost })
      .from(shippingZones)
      .where(
        and(
          eq(shippingZones.id, params.shippingZoneId),
          eq(shippingZones.storeId, session.user.storeId),
          eq(shippingZones.active, true),
        ),
      )
      .limit(1);
    if (!zone) throw new Error("Esa zona de envio no esta disponible.");
    shippingZone = zone;
  }

  const shippingAddress = params.shippingAddress ? shippingAddressSchema.parse(params.shippingAddress) : undefined;
  const shippingCost = shippingZone ? Number(shippingZone.cost) : 0;
  const orderTotal = total + shippingCost;

  const [order] = await db
    .insert(orders)
    .values({
      storeId: session.user.storeId,
      userId: session.user.id,
      source: "catalogo",
      status: manualMethod ? "pendiente_confirmacion" : "pendiente_pago",
      paymentMethod,
      total: orderTotal.toFixed(2),
      shippingZoneId: shippingZone?.id,
      shippingCost: shippingCost.toFixed(2),
      shippingAddress: shippingAddress ?? null,
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

  await notifyStaff({
    storeId: session.user.storeId,
    type: manualMethod ? "new_service_order" : "new_order",
    title: manualMethod ? `Nueva orden de servicio #${order.orderNumber}` : `Nuevo pedido #${order.orderNumber}`,
    link: "/admin/pedidos",
  });

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

    await sendManualPaymentAdminNotification({
      storeId: session.user.storeId,
      orderNumber: order.orderNumber,
      total: order.total,
      methodLabel: manualMethod.label,
      customerEmail: session.user.email ?? "(sin email)",
    });

    return {
      type: "manual" as const,
      orderId: order.id,
      orderNumber: order.orderNumber,
      methodLabel: manualMethod.label,
      instructions: manualMethod.instructions,
      receiptEligible: RECEIPT_ELIGIBLE_METHODS.includes(manualMethod.value),
    };
  }

  const preferenceItems = items.map((row) => ({
    title: row.product.name,
    quantity: row.item.quantity,
    unitPrice: Number(row.variant.price),
  }));
  // Envio como linea aparte (no prorrateado entre productos): mas claro
  // para el cliente en el Checkout Pro de Mercado Pago.
  if (shippingZone && shippingCost > 0) {
    preferenceItems.push({ title: `Envio - ${shippingZone.name}`, quantity: 1, unitPrice: shippingCost });
  }

  const preference = await createPreference({
    orderId: order.id,
    storeId: session.user.storeId,
    items: preferenceItems,
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

  const STATUS_NOTIFICATION_LABELS: Record<string, string> = {
    en_preparacion: "esta en preparacion",
    enviado: "fue enviado",
    entregado: "fue entregado",
  };
  await notify({
    storeId: session.user.storeId,
    recipientUserId: existing.userId,
    type: "order_status_changed",
    title: `Tu pedido #${existing.orderNumber} ${STATUS_NOTIFICATION_LABELS[nextStatus] ?? `paso a ${nextStatus}`}`,
    link: "/mi-cuenta/pedidos",
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

  // Aviso al cliente de que su pago manual quedo confirmado — antes de esto
  // el unico mail que recibia era el de instrucciones al crear la orden, no
  // habia ninguna confirmacion de que el admin ya lo verifico. Resiliente
  // (no bloquea la confirmacion si el mail falla).
  try {
    const [customer] = await db.select({ email: users.email }).from(users).where(eq(users.id, existing.userId)).limit(1);
    if (customer) {
      await sendMail({
        storeId: session.user.storeId,
        to: customer.email,
        subject: `Pago confirmado — orden #${updated.orderNumber}`,
        text: [
          `Confirmamos que recibimos el pago de tu orden #${updated.orderNumber} por ${formatCurrency(Number(updated.total))}.`,
          "Nos vamos a poner en contacto para coordinar la entrega.",
        ].join("\n\n"),
      });
    }
  } catch {
    // No-op: mismo criterio de resiliencia que el resto de los mails.
  }

  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/dashboard");

  return updated;
}

// El cliente sube un comprobante (foto/captura de la transferencia, PDF,
// etc.) despues de crear la orden de servicio, para que el admin lo revise
// antes de confirmar el pago. No es obligatorio ni bloquea nada — es una
// ayuda para el admin, la confirmacion sigue siendo manual.
export async function uploadPaymentReceipt(orderId: string, file: File) {
  const session = await auth();
  if (!session) throw new Error("Debes iniciar sesion.");

  const [existing] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, session.user.id)))
    .limit(1);
  if (!existing) throw new Error("Orden no encontrada.");
  if (existing.status !== "pendiente_confirmacion") {
    throw new Error("Esta orden ya no esta esperando confirmacion de pago.");
  }
  if (!RECEIPT_ELIGIBLE_METHODS.includes(existing.paymentMethod as ManualPaymentMethod)) {
    throw new Error("Este medio de pago no admite subir un comprobante.");
  }

  const allowedExtensions = ["jpg", "jpeg", "png", "webp", "pdf"];
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowedExtensions.includes(ext)) {
    throw new Error(`Extension no permitida. Usa: ${allowedExtensions.join(", ")}.`);
  }
  const maxSizeMb = Number(process.env.UPLOADS_MAX_SIZE_MB ?? 20);
  if (file.size > maxSizeMb * 1024 * 1024) {
    throw new Error(`El archivo supera el tamano maximo permitido (${maxSizeMb} MB).`);
  }

  const uploadsDir = process.env.UPLOADS_DIR ?? "./public/uploads";
  const receiptsDir = path.resolve(uploadsDir, "receipts");
  await mkdir(receiptsDir, { recursive: true });

  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(receiptsDir, filename), buffer);

  const [updated] = await db
    .update(orders)
    .set({ receiptUrl: `/uploads/receipts/${filename}`, receiptUploadedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "upload_receipt",
    entityType: "order",
    entityId: orderId,
    after: { receiptUrl: updated.receiptUrl },
  });

  await notifyStaff({
    storeId: session.user.storeId,
    type: "receipt_uploaded",
    title: `Comprobante subido para la orden #${existing.orderNumber}`,
    link: "/admin/pedidos",
  });

  revalidatePath("/admin/pedidos");

  return { receiptUrl: updated.receiptUrl };
}
