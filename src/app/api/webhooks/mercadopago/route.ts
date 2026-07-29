import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getDefaultStoreId } from "@/lib/db/store";
import { orders } from "@/lib/db/schema";
import { getPayment, getWebhookSecret } from "@/lib/mercadopago/client";
import { markOrderAsPaid } from "@/lib/orders/mark-paid";

/**
 * Paso 5 de docs/spec-ecommerce-base.md (critico, no saltear seguridad).
 * Unica fuente de verdad de un pago aprobado: nunca se confia en el
 * back_url de exito del navegador (el usuario puede cerrar la pestana
 * antes de volver, o mentir el resultado).
 */

// Algoritmo oficial de Mercado Pago ("Without SDK", ver
// https://www.mercadopago.com.mx/developers/en/docs/checkout-pro/payment-notifications):
// 1. Extraer ts y v1 del header x-signature.
// 2. Armar el manifest "id:{data.id};request-id:{x-request-id};ts:{ts};",
//    omitiendo los pares cuyo valor no este presente.
// 3. Calcular HMAC-SHA256(secret, manifest) en hex.
// 4. Comparar contra v1 en tiempo constante.
function parseXSignature(header: string | null): { ts?: string; v1?: string } {
  const result: { ts?: string; v1?: string } = {};
  if (!header) return result;

  for (const part of header.split(",")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key === "ts") result.ts = value;
    if (key === "v1") result.v1 = value;
  }
  return result;
}

function isValidSignature(req: NextRequest, dataId: string, secret: string | null): boolean {
  if (!secret) {
    console.error("No hay MP_WEBHOOK_SECRET configurado (ni en /admin/configuracion ni en env); rechazando webhook.");
    return false;
  }

  const { ts, v1 } = parseXSignature(req.headers.get("x-signature"));
  if (!ts || !v1) return false;

  const xRequestId = req.headers.get("x-request-id") ?? "";

  const parts: string[] = [];
  if (dataId) parts.push(`id:${dataId.toLowerCase()}`);
  if (xRequestId) parts.push(`request-id:${xRequestId}`);
  parts.push(`ts:${ts}`);
  const manifest = `${parts.join(";")};`;

  const computed = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  const computedBuf = Buffer.from(computed, "utf8");
  const givenBuf = Buffer.from(v1, "utf8");
  // Los buffers deben tener el mismo largo antes de timingSafeEqual (tira si
  // difieren) — si difieren, directamente no matchean.
  if (computedBuf.length !== givenBuf.length) return false;
  return crypto.timingSafeEqual(computedBuf, givenBuf);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const dataId = req.nextUrl.searchParams.get("data.id") ?? body?.data?.id ?? "";

  // Solo el topico "payment" nos interesa; otros (merchant_order, etc.) se
  // reconocen con 200 para que MP no reintente indefinidamente.
  if (body?.type !== "payment" || !dataId) {
    return NextResponse.json({ received: true });
  }

  // Multi-tenant no esta activado (una unica fila en `stores`, ver
  // src/lib/db/store.ts) — todavia no conocemos la orden ni su storeId en
  // este punto (recien se sabe despues de consultar el pago), asi que se
  // resuelve la tienda por defecto para las credenciales.
  const storeId = await getDefaultStoreId();
  const webhookSecret = await getWebhookSecret(storeId);

  if (!isValidSignature(req, String(dataId), webhookSecret)) {
    console.error("Webhook de Mercado Pago con firma invalida, rechazado.");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const payment = await getPayment(String(dataId), storeId);
  const orderId = payment.external_reference;
  if (!orderId) {
    return NextResponse.json({ received: true });
  }

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) {
    // No es un error de firma ni de payload: puede ser una orden de otro
    // ambiente (test vs prod) pegandole a este webhook. Se responde 200
    // para no generar reintentos infinitos.
    return NextResponse.json({ received: true });
  }

  const paymentId = String(payment.id);

  // Idempotencia: MP reintenta la notificacion (hasta 8 veces) hasta
  // recibir 200. Si este pago ya quedo aplicado, no se reprocesa.
  if (order.mpPaymentId === paymentId) {
    return NextResponse.json({ received: true });
  }

  if (payment.status === "approved") {
    // markOrderAsPaid ya es idempotente (no-op si ya esta "pagado"), pero
    // ademas descuenta stock / actualiza el pedido a medida / escribe
    // audit_logs en una sola transaccion — mismo lugar que usa la
    // confirmacion manual de pagos offline (ver src/lib/orders/actions.ts).
    await markOrderAsPaid({ orderId: order.id, actorUserId: order.userId, paymentReference: paymentId });
  } else if (payment.status === "rejected" || payment.status === "cancelled") {
    // Estados no aprobados: se deja la orden en su estado (no se toca
    // stock), solo se guarda el mpPaymentId para idempotencia.
    await db.update(orders).set({ mpPaymentId: paymentId }).where(eq(orders.id, order.id));
  }

  return NextResponse.json({ received: true });
}
