import { eq } from "drizzle-orm";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { db } from "@/lib/db";
import { getDefaultStoreId } from "@/lib/db/store";
import { stores } from "@/lib/db/schema";
import { decrypt } from "@/lib/crypto";

/**
 * Credenciales de Mercado Pago: primero se busca la config guardada en
 * /admin/configuracion (encriptada en `stores`), y si no esta seteada se
 * cae a las env vars MP_ACCESS_TOKEN / MP_WEBHOOK_SECRET (el deploy actual
 * en EasyPanel las usa asi, esto no lo rompe). No se valida nada al
 * importar el modulo (mismo patron que src/lib/db/index.ts), solo en el
 * primer uso real.
 */
async function getAccessToken(storeId?: string): Promise<string> {
  const id = storeId ?? (await getDefaultStoreId());
  const [store] = await db
    .select({ mpAccessTokenEncrypted: stores.mpAccessTokenEncrypted })
    .from(stores)
    .where(eq(stores.id, id))
    .limit(1);

  if (store?.mpAccessTokenEncrypted) {
    try {
      return decrypt(store.mpAccessTokenEncrypted);
    } catch {
      // Si no se puede desencriptar (ej. cambio de SETTINGS_ENCRYPTION_KEY),
      // cae al fallback de env var en vez de romper todo el checkout.
    }
  }

  if (process.env.MP_ACCESS_TOKEN) return process.env.MP_ACCESS_TOKEN;

  throw new Error(
    "No hay credenciales de Mercado Pago configuradas. Cargalas en /admin/configuracion o en la variable MP_ACCESS_TOKEN.",
  );
}

async function getClient(storeId?: string): Promise<MercadoPagoConfig> {
  return new MercadoPagoConfig({ accessToken: await getAccessToken(storeId) });
}

// Usado por el webhook para verificar x-signature antes de confiar en
// cualquier payload. Devuelve null (no lanza) si no hay secret configurado
// ni en DB ni en env — el llamador decide rechazar el webhook en ese caso.
export async function getWebhookSecret(storeId?: string): Promise<string | null> {
  const id = storeId ?? (await getDefaultStoreId());
  const [store] = await db
    .select({ mpWebhookSecretEncrypted: stores.mpWebhookSecretEncrypted })
    .from(stores)
    .where(eq(stores.id, id))
    .limit(1);

  if (store?.mpWebhookSecretEncrypted) {
    try {
      return decrypt(store.mpWebhookSecretEncrypted);
    } catch {
      // cae al fallback de abajo
    }
  }

  return process.env.MP_WEBHOOK_SECRET ?? null;
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
  storeId?: string;
  items: CreatePreferenceItem[];
  payerEmail?: string;
}) {
  const preference = new Preference(await getClient(params.storeId));

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

export async function getPayment(paymentId: string, storeId?: string) {
  const payment = new Payment(await getClient(storeId));
  return payment.get({ id: paymentId });
}
