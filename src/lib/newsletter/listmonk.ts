import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { stores } from "@/lib/db/schema";
import { decrypt } from "@/lib/crypto";

// Sincroniza un alta del formulario de newsletter local con la lista de
// Listmonk configurada en /admin/configuracion (ver settings/actions.ts).
// No tira excepcion hacia arriba -- mismo criterio de resiliencia que el
// resto de las integraciones (mail, Telegram, n8n): si Listmonk esta caido,
// mal configurado, o directamente no configurado, la suscripcion local ya
// quedo guardada y no depende de esto. Se llama "fire and forget" desde
// subscribeToNewsletter.
export async function syncSubscriberToListmonk(storeId: string, email: string): Promise<void> {
  const [store] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
  if (!store) return;
  if (!store.listmonkUrl || !store.listmonkApiUser || !store.listmonkApiTokenEncrypted || !store.listmonkListId) {
    return; // Listmonk no configurado para esta tienda -- no-op silencioso.
  }

  try {
    const token = decrypt(store.listmonkApiTokenEncrypted);
    const auth = Buffer.from(`${store.listmonkApiUser}:${token}`).toString("base64");
    const url = `${store.listmonkUrl.replace(/\/$/, "")}/api/subscribers`;
    const listId = Number(store.listmonkListId);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body: JSON.stringify({
        email,
        status: "enabled",
        lists: [listId],
        preconfirm_subscriptions: true,
      }),
    });

    // Listmonk devuelve 409 (o un error con "already exists") si el mail ya
    // esta suscrito -- no es un fallo real, tratarlo como exito silencioso.
    if (res.ok || res.status === 409) return;

    const body = await res.text().catch(() => "");
    if (body.toLowerCase().includes("already exists")) return;

    console.error(`[listmonk] No se pudo sincronizar ${email}: ${res.status} ${body.slice(0, 200)}`);
  } catch (error) {
    console.error(`[listmonk] Error sincronizando ${email}:`, error instanceof Error ? error.message : error);
  }
}
