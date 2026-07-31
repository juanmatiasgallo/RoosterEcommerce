// Sin "use server": es un helper interno que importan otras Server Actions
// (orders/actions.ts, custom-orders/actions.ts, mark-paid.ts), no algo que
// el cliente llame directo — mismo patron que mark-paid.ts.
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { sendTelegramNotification } from "@/lib/telegram/send";
import type { TelegramEventType } from "@/lib/telegram/event-types";
import { sendN8nWebhook } from "@/lib/webhooks/send";

// Nunca bloquea el flujo principal si falla (mismo criterio de resiliencia
// que sendMail): una notificacion in-app que no se pudo guardar no puede
// tirar abajo la creacion de una orden.
export async function notify(params: {
  storeId: string;
  recipientUserId?: string | null;
  type: string;
  title: string;
  body?: string;
  link?: string;
}) {
  try {
    await db.insert(notifications).values({
      storeId: params.storeId,
      recipientUserId: params.recipientUserId ?? null,
      type: params.type,
      title: params.title,
      body: params.body,
      link: params.link,
    });
  } catch {
    // No-op.
  }
}

// Atajo para el caso mas comun: avisar a todo el staff de la tienda (no a
// un cliente puntual) — recipientUserId queda nulo.
export async function notifyStaff(params: {
  storeId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
}) {
  await notify({ ...params, recipientUserId: null });

  // Telegram (avisos de negocio, ver src/lib/telegram/): unico choke point,
  // no hace falta tocar los call sites existentes de notifyStaff. El cast
  // es seguro en runtime: si params.type no coincide con ningun
  // TelegramEventType conocido, send.ts simplemente no encuentra template y
  // no manda nada (mismo resultado que un evento deshabilitado).
  await sendTelegramNotification({
    storeId: params.storeId,
    eventType: params.type as TelegramEventType,
    title: params.title,
    body: params.body,
    link: params.link,
  });

  // Webhook saliente generico (task #113, ver src/lib/webhooks/send.ts):
  // mismo choke point, mismos eventos -- pensado para automatizaciones
  // externas (ej. n8n del owner en otro VPS) sin agregar infraestructura a
  // este repo.
  await sendN8nWebhook(params);
}
