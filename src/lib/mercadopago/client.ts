import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

/**
 * Cliente perezoso (mismo patron que src/lib/db/index.ts): no valida
 * MP_ACCESS_TOKEN al importar el modulo, sino en el primer uso real, para no
 * romper `next build` en entornos donde la env todavia no esta seteada.
 */
function getClient(): MercadoPagoConfig {
  if (!process.env.MP_ACCESS_TOKEN) {
    throw new Error("MP_ACCESS_TOKEN no esta definida. Revisa tu archivo .env.");
  }
  return new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
}

export type CreatePreferenceItem = {
  title: string;
  quantity: number;
  unitPrice: number;
};

/**
 * Crea una preferencia de Checkout Pro para una orden. El pago se confirma
 * SIEMPRE via webhook (ver src/app/api/webhooks/mercadopago/route.ts), nunca
 * confiando en el back_url de exito: el usuario puede cerrar la pestana
 * antes de volver, o el navegador puede mentir.
 */
export async function createPreference(params: {
  orderId: string;
  items: CreatePreferenceItem[];
  payerEmail?: string;
}) {
  const preference = new Preference(getClient());

  const result = await preference.create({
    body: {
      items: params.items.map((item) => ({
        id: params.orderId,
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        currency_id: "UYU",
      })),
      payer: params.payerEmail ? { email: params.payerEmail } : undefined,
      external_reference: params.orderId,
      back_urls: {
        success: `${process.env.AUTH_URL}/checkout/exito`,
        pending: `${process.env.AUTH_URL}/checkout/pendiente`,
        failure: `${process.env.AUTH_URL}/checkout/error`,
      },
      auto_return: "approved",
      notification_url: `${process.env.AUTH_URL}/api/webhooks/mercadopago`,
    },
  });

  return result;
}

export async function getPayment(paymentId: string) {
  const payment = new Payment(getClient());
  return payment.get({ id: paymentId });
}
