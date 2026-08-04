import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, customOrders, loyaltyPoints, orderItems, orders, productVariants, stores, users } from "@/lib/db/schema";
import { notify } from "@/lib/notifications/notify";
import { sendMail } from "@/lib/mail";
import { generateReceiptPdf, getReceiptUrl, type ReceiptItem } from "@/lib/receipt/pdf";
import { formatCurrency } from "@/lib/format";
import { getEmailTemplateForSending } from "@/lib/email-templates/render";
import type { ShippingAddress } from "@/lib/orders/schema";

// Mismas labels que /mi-cuenta/compras, /admin/pedidos y receipt/actions.ts
// (duplicadas ahi tambien, ver comentario en receipt/actions.ts).
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  mercado_pago: "Mercado Pago",
  transferencia: "Transferencia",
  abitab: "Abitab",
  redpagos: "Red Pagos",
  mi_dinero: "Debito Mi Dinero",
  prex: "Prex",
  contra_entrega: "Pago contra entrega",
};

/**
 * Unico lugar donde una orden pasa de verdad a "pagado" — lo usan el
 * webhook de Mercado Pago (pago automatico, ver
 * src/app/api/webhooks/mercadopago/route.ts) y la confirmacion manual del
 * admin para medios de pago offline (transferencia/Abitab/RedPagos, ver
 * confirmManualPayment en src/lib/orders/actions.ts). Sin "use server": no
 * es una Server Action invocable desde el cliente, solo un modulo de
 * servidor que importan esos dos lugares.
 *
 * Idempotente (si la orden ya esta "pagado" no hace nada) y descuenta stock
 * recien aca, nunca antes — mismo criterio que ya regia para el webhook.
 */
export async function markOrderAsPaid(params: {
  orderId: string;
  // Quien queda en audit_logs.userId para esta accion: el webhook pasa
  // order.userId (mismo criterio que ya regia antes de este refactor), la
  // confirmacion manual del admin pasa el id del admin que confirma.
  actorUserId: string;
  paymentReference?: string; // mpPaymentId, si vino de Mercado Pago
}) {
  const [order] = await db.select().from(orders).where(eq(orders.id, params.orderId)).limit(1);
  if (!order) throw new Error("Orden no encontrada.");
  if (order.status === "pagado") return order;

  const updated = await db.transaction(async (tx) => {
    const [result] = await tx
      .update(orders)
      .set({
        status: "pagado",
        ...(params.paymentReference && { mpPaymentId: params.paymentReference }),
      })
      .where(eq(orders.id, order.id))
      .returning();

    if (order.source === "catalogo") {
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      for (const item of items) {
        if (!item.variantId) continue;
        await tx
          .update(productVariants)
          .set({ stock: sql`${productVariants.stock} - ${item.quantity}` })
          .where(eq(productVariants.id, item.variantId));
      }
    } else if (order.source === "pedido_custom" && order.customOrderId) {
      await tx.update(customOrders).set({ status: "pagado" }).where(eq(customOrders.id, order.customOrderId));
    }

    // Puntos por compra (si el admin configuro una tasa > 0 en
    // /admin/configuracion). Se usa la tasa vigente en el momento del pago,
    // no se recalcula si despues cambia. redondeado hacia abajo para no
    // regalar puntos de mas por redondeo.
    const [store] = await tx.select({ loyaltyPointsPer100: stores.loyaltyPointsPer100 }).from(stores).where(eq(stores.id, order.storeId)).limit(1);
    if (store && store.loyaltyPointsPer100 > 0) {
      const earnedPoints = Math.floor((Number(order.total) / 100) * store.loyaltyPointsPer100);
      if (earnedPoints > 0) {
        await tx.insert(loyaltyPoints).values({
          storeId: order.storeId,
          userId: order.userId,
          orderId: order.id,
          type: "earned",
          points: earnedPoints,
          note: `Compra #${order.orderNumber}`,
        });
      }
    }

    await tx.insert(auditLogs).values({
      storeId: order.storeId,
      userId: params.actorUserId,
      action: "payment_confirmed",
      entityType: "order",
      entityId: order.id,
      before: { status: order.status },
      after: { status: "pagado" },
    });

    return result;
  });

  await notify({
    storeId: order.storeId,
    recipientUserId: order.userId,
    type: "order_paid",
    title: `Confirmamos el pago de tu pedido #${order.orderNumber}`,
    link: "/mi-cuenta/pedidos",
  });

  // Talon-comprobante con QR por mail (task #103), tanto para compras de
  // catalogo como para pedidos a medida ya pagados -- antes esto se
  // mandaba solo para "catalogo" porque getReceiptData filtraba por ese
  // source (la pagina de comprobante 404eaba para pedido_custom); ahora
  // /mi-cuenta/compras/[id] acepta las dos, asi que el mail tambien.
  // Resiliente: nunca bloquea la confirmacion del pago si el mail o el PDF
  // fallan, mismo criterio que el resto de los mails de este flujo.
  {
    try {
      const [customer] = await db.select({ email: users.email, name: users.name }).from(users).where(eq(users.id, order.userId)).limit(1);
      const [store] = await db.select({ name: stores.name }).from(stores).where(eq(stores.id, order.storeId)).limit(1);
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));

      if (customer && store) {
        const receiptItems: ReceiptItem[] = items.map((item) => ({
          productName: item.productName,
          variantLabel: item.variantLabel,
          variantSku: item.variantSku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }));

        const pdfBytes = await generateReceiptPdf(order.id, {
          orderNumber: order.orderNumber,
          createdAt: order.createdAt,
          status: "pagado",
          statusLabel: "Pago confirmado",
          paymentMethod: order.paymentMethod,
          paymentMethodLabel: PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod,
          source: order.source,
          items: receiptItems,
          shippingCost: order.shippingCost,
          discountAmount: order.discountAmount,
          couponCode: order.couponCode,
          total: updated.total,
          customerName: customer.name,
          storeName: store.name,
          shippingAddress: (order.shippingAddress as ShippingAddress | null) ?? null,
          // El mail de confirmacion se manda apenas se aprueba el pago -- el
          // codigo de seguimiento recien se carga despues, cuando el admin
          // despacha el pedido (ver setOrderTracking), asi que en este punto
          // siempre es null.
          trackingCarrier: null,
          trackingCode: null,
        });

        const vars = {
          customerName: customer.name,
          orderNumber: String(order.orderNumber),
          total: formatCurrency(Number(updated.total)),
          receiptUrl: getReceiptUrl(order.id),
        };
        const rendered = await getEmailTemplateForSending(order.storeId, "order_paid", vars);

        if (rendered.enabled) {
          await sendMail({
            storeId: order.storeId,
            to: customer.email,
            subject: rendered.subject,
            text: `Confirmamos el pago de tu compra #${order.orderNumber} por ${vars.total}. Ver estado: ${vars.receiptUrl}`,
            html: rendered.html,
            attachments: [
              { filename: `recibo-orden-${order.orderNumber}.pdf`, content: Buffer.from(pdfBytes), contentType: "application/pdf" },
            ],
          });
        }
      }
    } catch {
      // No-op: mismo criterio de resiliencia que el resto de los mails.
    }
  }

  return updated;
}
