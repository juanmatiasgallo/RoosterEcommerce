"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import type { Role } from "@/lib/auth/schema";
import { db } from "@/lib/db";
import { auditLogs, cartItems, discountCampaigns, discountCoupons, orderItems, orders, shippingZones, stores, users } from "@/lib/db/schema";
import { getCartItems } from "@/lib/cart/actions";
import { findUsableCampaign } from "@/lib/discount-campaigns/actions";
import { computeCampaignDiscount } from "@/lib/discount-campaigns/pure";
import { createPreference } from "@/lib/mercadopago/client";
import { markOrderAsPaid } from "@/lib/orders/mark-paid";
import { shippingAddressSchema, type ShippingAddress } from "@/lib/orders/schema";
import { notify, notifyStaff } from "@/lib/notifications/notify";
import { sendMail } from "@/lib/mail";
import { formatCurrency } from "@/lib/format";
import { getVacationStatus } from "@/lib/settings/actions";
import { RECEIPT_ELIGIBLE_METHODS } from "@/lib/orders/receipt-eligibility";

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

// Publico para el usuario logueado (no recibe id ajeno, siempre lee la
// propia sesion): la direccion/zona que uso en su ultima compra, para
// precargar el Paso 2 del checkout y que no tenga que volver a tipearla.
export async function getDefaultShippingAddress(): Promise<{
  address: ShippingAddress | null;
  shippingZoneId: string | null;
}> {
  const session = await auth();
  if (!session) return { address: null, shippingZoneId: null };

  const [user] = await db
    .select({ defaultShippingAddress: users.defaultShippingAddress, defaultShippingZoneId: users.defaultShippingZoneId })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) return { address: null, shippingZoneId: null };

  const parsed = shippingAddressSchema.safeParse(user.defaultShippingAddress);
  return {
    address: parsed.success ? parsed.data : null,
    shippingZoneId: user.defaultShippingZoneId ?? null,
  };
}

// Edicion manual desde /mi-cuenta/perfil (task #116): a diferencia del
// guardado automatico de checkoutCart (que solo pisa la direccion default
// como efecto secundario de una compra), esta es la accion explicita que
// el cliente dispara desde "Mi perfil" para actualizar su direccion
// guardada sin tener que pasar por un checkout.
export async function updateMyShippingAddress(address: ShippingAddress, shippingZoneId: string | null) {
  const session = await auth();
  if (!session) throw new Error("Debes iniciar sesion.");

  const data = shippingAddressSchema.parse(address);

  await db
    .update(users)
    .set({ defaultShippingAddress: data, defaultShippingZoneId: shippingZoneId })
    .where(eq(users.id, session.user.id));

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "update_shipping_address",
    entityType: "user",
    entityId: session.user.id,
    after: { defaultShippingAddress: data, defaultShippingZoneId: shippingZoneId },
  });

  return { success: true as const };
}

// Medio de pago usado en el checkout anterior del usuario (ver el guardado
// en checkoutCart mas abajo) — se precarga en el Paso 3 del wizard. Nulo si
// todavia no compro nada, el wizard arranca en "mercado_pago" por default.
export async function getMyLastPaymentMethod(): Promise<PaymentMethod | null> {
  const session = await auth();
  if (!session) return null;

  const [user] = await db
    .select({ lastPaymentMethod: users.lastPaymentMethod })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return user?.lastPaymentMethod ?? null;
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
  // Codigo de un cupon de puntos del propio usuario (ver
  // src/lib/loyalty/actions.ts) — nunca se confia en un monto que mande el
  // cliente, solo en el codigo, y se revalida todo server-side (dueño,
  // no usado, tienda) antes de aplicarlo.
  couponCode?: string;
  // Codigo de promocion general (backlog "sistema de ofertas/descuentos",
  // ver src/lib/discount-campaigns/): distinto del cupon de puntos de
  // arriba -- cualquier visitante puede tener uno, no esta atado a un
  // usuario. Mutuamente excluyente con couponCode en la UI del checkout,
  // pero si por algun motivo llegaran los dos, gana el cupon de puntos
  // (mas especifico/personal) y este se ignora.
  promoCode?: string;
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

  // Cupon de puntos (opcional): se revalida todo server-side — que exista,
  // que sea de este usuario y tienda, y que no este usado — nunca se confia
  // en el monto que pudiera mandar el cliente. El descuento se tope al
  // subtotal de productos (nunca descuenta el envio ni deja el total
  // negativo).
  let coupon: { id: string; code: string; amount: string } | undefined;
  let discountAmount = 0;
  // Codigo de campania general (backlog "sistema de ofertas/descuentos"):
  // solo se busca si no vino un cupon de puntos (ver comentario en el tipo
  // de parametros de arriba). Misma condicion que previewDiscountCode del
  // checkout (findUsableCampaign), para que "valido en el preview" siga
  // siendo valido aca -- salvo que alguien mas agote el cupo justo en el
  // medio, cubierto abajo por el update condicionado a usageLimit.
  let campaign: { id: string; code: string; type: "percent" | "fixed"; value: string } | undefined;
  if (params.couponCode) {
    const [found] = await db
      .select({ id: discountCoupons.id, code: discountCoupons.code, amount: discountCoupons.amount })
      .from(discountCoupons)
      .where(
        and(
          eq(discountCoupons.code, params.couponCode),
          eq(discountCoupons.userId, session.user.id),
          eq(discountCoupons.storeId, session.user.storeId),
          isNull(discountCoupons.usedAt),
        ),
      )
      .limit(1);
    if (!found) throw new Error("Ese cupon no es valido o ya fue usado.");
    coupon = found;
    discountAmount = Math.min(Number(found.amount), total);
  } else if (params.promoCode) {
    const found = await findUsableCampaign(params.promoCode, session.user.storeId);
    if (!found) throw new Error("Ese codigo de promocion no es valido, esta inactivo o ya se agoto.");
    campaign = found;
    discountAmount = computeCampaignDiscount(found, total);
  }

  // Ratio para prorratear el descuento entre los items al armar la
  // preferencia de Mercado Pago (que no acepta un precio negativo aparte
  // para "descuento") — el envio nunca se descuenta, solo el subtotal de
  // productos.
  const discountRatio = discountAmount > 0 && total > 0 ? (total - discountAmount) / total : 1;
  const orderTotal = Math.max(0, total - discountAmount) + shippingCost;

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
      discountAmount: discountAmount.toFixed(2),
      couponCode: coupon?.code ?? campaign?.code,
      shippingAddress: shippingAddress ?? null,
    })
    .returning();

  // Marca el cupon como usado recien ahora que la orden ya existe (nunca
  // antes: si algo de arriba fallara, no queremos un cupon quemado sin
  // orden real detras).
  if (coupon) {
    await db
      .update(discountCoupons)
      .set({ usedAt: new Date(), usedOrderId: order.id })
      .where(eq(discountCoupons.id, coupon.id));
  }

  // Idem para el codigo de campania: recien se consume el cupo una vez que
  // la orden ya existe de verdad. sql`... + 1` (no leer+sumar en JS) para
  // que dos checkouts casi simultaneos no pisen el conteo del otro.
  if (campaign) {
    await db
      .update(discountCampaigns)
      .set({ usageCount: sql`${discountCampaigns.usageCount} + 1` })
      .where(eq(discountCampaigns.id, campaign.id));
  }

  await db.insert(orderItems).values(
    items.map((row) => ({
      orderId: order.id,
      variantId: row.variant.id,
      productName: row.product.name,
      variantLabel: [row.variant.material, row.variant.color, row.variant.size].filter(Boolean).join(" ") || null,
      variantSku: row.variant.sku,
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

  // Guarda la direccion (y zona) y el medio de pago recien usados como
  // default del usuario, para precargarlos en su proxima compra (ver
  // getDefaultShippingAddress y getMyLastPaymentMethod mas abajo). No
  // bloquea el checkout si falla por algun motivo raro: la orden ya quedo
  // creada, esto es solo una comodidad.
  try {
    await db
      .update(users)
      .set({
        lastPaymentMethod: paymentMethod,
        ...(shippingAddress && {
          defaultShippingAddress: shippingAddress,
          defaultShippingZoneId: shippingZone?.id ?? null,
        }),
      })
      .where(eq(users.id, session.user.id));
  } catch {
    // no-op
  }

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

  // Mercado Pago no tiene un campo de "descuento" en la preferencia basica
  // de Checkout Pro, asi que el cupon se aplica prorrateando el precio de
  // cada producto por discountRatio (el envio nunca se descuenta). El
  // ultimo item absorbe el centavo de diferencia por redondeo, para que la
  // suma le cierre exacto al total que se le cobra al cliente.
  const preferenceItems = items.map((row) => ({
    title: row.product.name,
    quantity: row.item.quantity,
    unitPrice: Math.round(Number(row.variant.price) * discountRatio * 100) / 100,
  }));
  if (discountRatio < 1 && preferenceItems.length > 0) {
    const targetProductsTotal = Math.round((total - discountAmount) * 100) / 100;
    const roundedSum = preferenceItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const diff = Math.round((targetProductsTotal - roundedSum) * 100) / 100;
    if (diff !== 0) {
      const last = preferenceItems[preferenceItems.length - 1];
      last.unitPrice = Math.max(0, Math.round((last.unitPrice + diff / last.quantity) * 100) / 100);
    }
  }
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

// Lectura scoped al usuario logueado, para "Mis compras" (catalogo) en
// /mi-cuenta/compras — mismo criterio que getMyCustomOrders en
// custom-orders/actions.ts. Excluye "pendiente_pago": una orden que nunca se
// termino de pagar no es una "compra" para el cliente.
export async function getMyOrders() {
  const session = await auth();
  if (!session) throw new Error("Debes iniciar sesion.");

  const orderRows = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.userId, session.user.id),
        eq(orders.source, "catalogo"),
        ne(orders.status, "pendiente_pago"),
      ),
    )
    .orderBy(desc(orders.createdAt));

  if (orderRows.length === 0) return [];

  const itemRows = await db
    .select()
    .from(orderItems)
    .where(
      inArray(
        orderItems.orderId,
        orderRows.map((row) => row.id),
      ),
    );

  const itemsByOrder = new Map<string, typeof itemRows>();
  for (const item of itemRows) {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push(item);
    itemsByOrder.set(item.orderId, list);
  }

  return orderRows.map((order) => ({ order, items: itemsByOrder.get(order.id) ?? [] }));
}

export type MyOrderRow = Awaited<ReturnType<typeof getMyOrders>>[number];

type OrderStatus = typeof orders.$inferSelect.status;

// Camino feliz explicito, sin saltos: "pagado" -> "en_cola" ->
// "imprimiendo" -> "postprocesado" -> "enviado" -> "entregado". "cancelado"
// es terminal y no se maneja aca (ver Paso 5: solo el webhook toca el
// estado de una orden no aprobada).
const ORDER_STATUS_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus>> = {
  pagado: "en_cola",
  en_cola: "imprimiendo",
  imprimiendo: "postprocesado",
  postprocesado: "enviado",
  enviado: "entregado",
};

export type AdvanceableOrderStatus = "en_cola" | "imprimiendo" | "postprocesado" | "enviado" | "entregado";

export async function updateOrderStatus(id: string, nextStatus: AdvanceableOrderStatus) {
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
    en_cola: "entro en la cola de impresion",
    imprimiendo: "se esta imprimiendo",
    postprocesado: "termino de imprimirse y esta en postprocesado",
    enviado: "fue enviado",
    entregado: "fue entregado",
  };
  const statusLabel = STATUS_NOTIFICATION_LABELS[nextStatus] ?? `paso a ${nextStatus}`;
  await notify({
    storeId: session.user.storeId,
    recipientUserId: existing.userId,
    type: "order_status_changed",
    title: `Tu pedido #${existing.orderNumber} ${statusLabel}`,
    link: "/mi-cuenta/pedidos",
  });

  // Mail al cliente en cada transicion del pipeline (antes solo se mandaba
  // mail en la creacion de la orden y en la confirmacion de pago). Resiliente
  // -- no bloquea el cambio de estado si el mail falla, mismo criterio que
  // el resto de los mails de este archivo.
  try {
    const [customer] = await db.select({ email: users.email }).from(users).where(eq(users.id, existing.userId)).limit(1);
    if (customer) {
      await sendMail({
        storeId: session.user.storeId,
        to: customer.email,
        subject: `Tu pedido #${existing.orderNumber} ${statusLabel}`,
        text: [
          `Tu pedido #${existing.orderNumber} ${statusLabel}.`,
          "",
          "Segui el estado completo desde tu cuenta: /mi-cuenta/pedidos",
        ].join("\n"),
      });
    }
  } catch {
    // No-op: mismo criterio de resiliencia que el resto de los mails.
  }

  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/dashboard");

  return updated;
}

// Codigo de seguimiento del envio (task #40/#41): independiente del
// pipeline de estados de arriba porque el admin a veces tiene el codigo
// antes de marcar "enviado" (ej. lo genera al armar el bulto) -- editable en
// cualquier momento, no atado a una transicion puntual. Transportista en
// texto libre (no enum): la mayoria de las veces es DAC, pero tambien hay
// retiro en local o envios coordinados aparte sin codigo de terceros.
export async function setOrderTracking(id: string, input: { carrier: string; code: string }) {
  const session = await requireStaff();

  const [existing] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.storeId, session.user.storeId)))
    .limit(1);
  if (!existing) throw new Error("Orden no encontrada.");

  const carrier = input.carrier.trim();
  const code = input.code.trim();
  if (!carrier || !code) {
    throw new Error("Transportista y codigo son requeridos.");
  }

  const [updated] = await db
    .update(orders)
    .set({ trackingCarrier: carrier, trackingCode: code })
    .where(eq(orders.id, id))
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "set_tracking",
    entityType: "order",
    entityId: id,
    before: { trackingCarrier: existing.trackingCarrier, trackingCode: existing.trackingCode },
    after: { trackingCarrier: updated.trackingCarrier, trackingCode: updated.trackingCode },
  });

  await notify({
    storeId: session.user.storeId,
    recipientUserId: existing.userId,
    type: "order_status_changed",
    title: `Tu pedido #${existing.orderNumber} ya tiene codigo de seguimiento`,
    link: "/mi-cuenta/compras",
  });

  revalidatePath("/admin/pedidos");
  revalidatePath(`/mi-cuenta/compras/${id}`);

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
  //
  // Solo para pedido_custom: las ordenes "catalogo" ya reciben un mail mas
  // completo (comprobante en PDF con QR, ver getReceiptUrl) desde el propio
  // markOrderAsPaid de arriba — mandar este tambien seria un mail duplicado
  // para el mismo evento.
  if (existing.source !== "catalogo") {
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
