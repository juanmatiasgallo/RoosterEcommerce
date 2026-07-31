// Sin "use server": helper interno que importa notify.ts, mismo criterio
// que ese archivo (no algo que el cliente llame directo).
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { stores, telegramTemplates } from "@/lib/db/schema";
import { decrypt } from "@/lib/crypto";
import { renderTelegramTemplate, type TelegramEventType } from "./event-types";

/**
 * Se llama desde notifyStaff() (ver src/lib/notifications/notify.ts) --
 * unico choke point, no hace falta tocar los 5+ call sites que ya avisan al
 * staff por notificacion in-app. Nunca bloquea el flujo principal si falla
 * (mismo criterio que notify() y sendMail): un aviso de Telegram que no se
 * pudo mandar no puede tirar abajo la creacion de una orden.
 */
export async function sendTelegramNotification(params: {
  storeId: string;
  eventType: TelegramEventType;
  title: string;
  body?: string | null;
  link?: string | null;
}) {
  try {
    const [store] = await db.select().from(stores).where(eq(stores.id, params.storeId)).limit(1);
    if (!store?.telegramBotTokenEncrypted || !store.telegramChatId) return;

    const [tpl] = await db
      .select()
      .from(telegramTemplates)
      .where(
        and(eq(telegramTemplates.storeId, params.storeId), eq(telegramTemplates.eventType, params.eventType)),
      )
      .limit(1);
    // Sin template sembrado o deshabilitado -- no manda nada, ni es un
    // error (el admin puede no haber abierto /admin/configuracion todavia,
    // o haber apagado ese evento a proposito).
    if (!tpl || !tpl.enabled) return;

    const botToken = decrypt(store.telegramBotTokenEncrypted);
    const baseUrl = process.env.AUTH_URL?.replace(/\/$/, "") ?? "";
    const absoluteLink = params.link ? `${baseUrl}${params.link}` : undefined;

    const text = renderTelegramTemplate(tpl.template, {
      title: params.title,
      body: params.body,
      link: absoluteLink,
      storeName: store.name,
    });

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: store.telegramChatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
  } catch {
    // No-op, mismo criterio que notify.ts.
  }
}
