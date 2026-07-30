"use client";

import { useEffect } from "react";
import { trackPurchaseOnce } from "@/lib/analytics/track";

// Estados en los que el pago YA esta confirmado (ver orderStatusEnum en
// src/lib/db/schema.ts y order-status-tracker.tsx): todo lo que no sea
// pendiente_pago/pendiente_confirmacion/cancelado significa que el webhook
// de Mercado Pago ya proceso el pago.
const UNCONFIRMED_STATUSES = new Set(["pendiente_pago", "pendiente_confirmacion", "cancelado"]);

/**
 * Contraparte de la instrumentacion de "compra_confirmada" en
 * checkout-wizard.tsx (flujo manual, thank-you inmediato) para el flujo de
 * Mercado Pago: el pago se confirma por webhook DESPUES de que el cliente ya
 * salio del sitio (ver CLAUDE.md, "la confirmacion del pago es SIEMPRE por
 * webhook"), asi que no hay ningun momento client-side en el checkout mismo
 * para registrar la compra con su monto real. El primer lugar donde el
 * cliente vuelve a estar presente con el pago ya reflejado es esta pagina
 * (comprobante, /mi-cuenta/compras/[id], adonde redirige /checkout/exito).
 *
 * trackPurchaseOnce ya deduplica por orderId en localStorage -- esta pagina
 * se revisita muchas veces despues de la compra (el cliente vuelve a mirar
 * el pedido, descarga el PDF) y no hay que contar la venta de nuevo cada vez.
 */
export function PurchaseConfirmedTracker({
  orderId,
  orderNumber,
  status,
  total,
  paymentMethodLabel,
}: {
  orderId: string;
  orderNumber: number;
  status: string;
  total: number;
  paymentMethodLabel: string;
}) {
  useEffect(() => {
    if (UNCONFIRMED_STATUSES.has(status)) return;
    trackPurchaseOnce(orderId, {
      orderId,
      orderNumber,
      revenue: total,
      currency: "UYU",
      paymentMethod: paymentMethodLabel,
    });
  }, [orderId, orderNumber, status, total, paymentMethodLabel]);

  return null;
}
