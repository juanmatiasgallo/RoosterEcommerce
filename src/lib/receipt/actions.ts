"use server";

import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { orderItems, orders, stores, users } from "@/lib/db/schema";
import { generateReceiptQrDataUrl, type ReceiptData, type ReceiptItem } from "@/lib/receipt/pdf";
import type { ShippingAddress } from "@/lib/orders/schema";

// Mismas labels que /mi-cuenta/compras y /admin/pedidos (duplicadas ahi
// tambien) — no vale la pena centralizarlas en un modulo compartido todavia,
// son 7 entradas fijas que cambian poco.
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  mercado_pago: "Mercado Pago",
  transferencia: "Transferencia",
  abitab: "Abitab",
  redpagos: "Red Pagos",
  mi_dinero: "Debito Mi Dinero",
  prex: "Prex",
  contra_entrega: "Pago contra entrega",
};

const STATUS_LABELS: Record<string, string> = {
  pendiente_pago: "Pendiente de pago",
  pendiente_confirmacion: "Esperando confirmacion de pago",
  pagado: "Pago confirmado",
  en_cola: "En cola de impresion",
  imprimiendo: "Imprimiendo",
  postprocesado: "En postprocesado",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

/**
 * Datos para el comprobante (pagina web + PDF) de una compra del catalogo.
 * Scoped al usuario logueado — mismo criterio que getMyOrders. Devuelve
 * null si la orden no existe, no es del usuario, o no es una compra de
 * catalogo (los pedidos a medida no tienen este comprobante, ver
 * getMyOrders en orders/actions.ts).
 */
export async function getReceiptData(
  orderId: string,
): Promise<(ReceiptData & { orderId: string; paymentReceiptUrl: string | null }) | null> {
  const session = await auth();
  if (!session) return null;

  const [row] = await db
    .select({ order: orders, customerName: users.name, storeName: stores.name })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .innerJoin(stores, eq(stores.id, orders.storeId))
    .where(and(eq(orders.id, orderId), eq(orders.userId, session.user.id), eq(orders.source, "catalogo")))
    .limit(1);
  if (!row) return null;

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const receiptItems: ReceiptItem[] = items.map((item) => ({
    productName: item.productName,
    variantLabel: item.variantLabel,
    variantSku: item.variantSku,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
  }));

  return {
    orderId: row.order.id,
    orderNumber: row.order.orderNumber,
    createdAt: row.order.createdAt,
    status: row.order.status,
    statusLabel: STATUS_LABELS[row.order.status] ?? row.order.status,
    paymentMethod: row.order.paymentMethod,
    paymentMethodLabel: PAYMENT_METHOD_LABELS[row.order.paymentMethod] ?? row.order.paymentMethod,
    items: receiptItems,
    shippingCost: row.order.shippingCost,
    discountAmount: row.order.discountAmount,
    couponCode: row.order.couponCode,
    total: row.order.total,
    customerName: row.customerName,
    storeName: row.storeName,
    // jsonb sin $type<> en el schema (ver schema.ts) -> Drizzle lo tipa
    // unknown; se castea aca, no en el schema, para no afectar el resto de
    // los usos de `orders.shippingAddress` en el codigo.
    shippingAddress: (row.order.shippingAddress as ShippingAddress | null) ?? null,
    trackingCarrier: row.order.trackingCarrier,
    trackingCode: row.order.trackingCode,
    // Comprobante ya subido (si lo hay): antes no se traia aca, asi que
    // ReceiptUpload siempre arrancaba en blanco del lado del cliente y un
    // refresh "perdia" el archivo aunque siguiera guardado en la orden --
    // ahora la pagina hidrata el estado inicial con esto, ver
    // receipt-upload.tsx. Nombrado distinto a getReceiptUrl() (de mas
    // arriba en este archivo, el link publico al comprobante para el QR)
    // para no confundir dos cosas totalmente distintas.
    paymentReceiptUrl: row.order.receiptUrl,
  };
}

/**
 * Mismo comprobante que getReceiptData, pero ademas trae el QR ya generado
 * (data URL) en un solo viaje -- pensado para el componente cliente que se
 * muestra apenas se genera una orden de servicio (checkout-wizard.tsx), que
 * no puede llamar a generateReceiptQrDataUrl directo por ser una funcion
 * "server-only" fuera de un Server Action.
 */
export async function getReceiptView(orderId: string) {
  const data = await getReceiptData(orderId);
  if (!data) return null;
  const qrDataUrl = await generateReceiptQrDataUrl(orderId);
  return { ...data, qrDataUrl };
}
