import { NextRequest, NextResponse } from "next/server";
import { getPayment } from "@/lib/mercadopago/client";

/**
 * Unica fuente de verdad de un pago aprobado. TODO (ver docs/spec-ecommerce-base.md):
 * - Verificar la firma `x-signature` / `x-request-id` contra MP_WEBHOOK_SECRET
 *   antes de confiar en el payload (evita que alguien falsifique un "pago
 *   exitoso" pegandole directo a este endpoint).
 * - Idempotencia: si ya existe una orden con este mpPaymentId en estado
 *   "pagado", no reprocesar (MP puede reintentar la notificacion).
 * - Actualizar `orders.status` a "pagado" y escribir en `audit_logs`.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (body?.type === "payment" && body?.data?.id) {
    const payment = await getPayment(body.data.id);
    // TODO: buscar la orden por external_reference (payment.external_reference)
    // y actualizar su estado segun payment.status ("approved", "rejected", etc.)
    console.log("Webhook MP recibido", payment.status, payment.external_reference);
  }

  return NextResponse.json({ received: true });
}
