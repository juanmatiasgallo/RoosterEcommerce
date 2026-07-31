// Sin "use server": helper interno que importa notify.ts y settings/actions.ts,
// mismo criterio que src/lib/telegram/send.ts (no algo que el cliente llame
// directo).
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { stores } from "@/lib/db/schema";
import { decrypt } from "@/lib/crypto";

/**
 * Webhook saliente generico (task #113): pensado para que el owner conecte
 * eventos de la tienda a automatizaciones externas (n8n, Zapier, lo que
 * sea) sin que ese sistema tenga que vivir en este repo ni en este VPS. Se
 * llama desde notifyStaff() -- mismo choke point que Telegram, mismos
 * eventos, sin tener que tocar los call sites existentes.
 *
 * Nunca bloquea el flujo principal si falla (mismo criterio que
 * sendTelegramNotification y notify()).
 */
export async function sendN8nWebhook(params: {
  storeId: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
}) {
  try {
    const [store] = await db.select().from(stores).where(eq(stores.id, params.storeId)).limit(1);
    if (!store?.n8nWebhookUrl) return;

    const baseUrl = process.env.AUTH_URL?.replace(/\/$/, "") ?? "";
    const absoluteLink = params.link ? `${baseUrl}${params.link}` : null;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (store.n8nWebhookSecretEncrypted) {
      headers["X-Webhook-Secret"] = decrypt(store.n8nWebhookSecretEncrypted);
    }

    await fetch(store.n8nWebhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        type: params.type,
        title: params.title,
        body: params.body ?? null,
        link: absoluteLink,
        storeName: store.name,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    // No-op, mismo criterio que el resto de los canales de notificacion.
  }
}
