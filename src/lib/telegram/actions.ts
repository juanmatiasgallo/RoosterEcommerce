"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { auditLogs, stores, telegramTemplates } from "@/lib/db/schema";
import { encrypt, decrypt } from "@/lib/crypto";
import { TELEGRAM_EVENT_TYPES, renderTelegramTemplate } from "./event-types";
import { updateTelegramSettingsSchema, updateTelegramTemplateSchema } from "./schema";

// Mismo criterio que settings/actions.ts: admin-only estricto, no el molde
// habitual admin+empleado (esto expone/controla un bot token real).
async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    throw new Error("No autorizado.");
  }
  return session;
}

async function logAudit(params: {
  userId: string;
  storeId: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
}) {
  await db.insert(auditLogs).values({
    storeId: params.storeId,
    userId: params.userId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    before: params.before ?? null,
    after: params.after ?? null,
  });
}

// Nunca se expone el bot token real (ni encriptado) al frontend ni a
// audit_logs -- solo si esta seteado o no, mismo criterio que
// smtpPasswordSet en settings/actions.ts.
function toPublicSettings(store: typeof stores.$inferSelect) {
  return {
    telegramChatId: store.telegramChatId,
    telegramBotTokenSet: Boolean(store.telegramBotTokenEncrypted),
  };
}

// Crea las filas faltantes en telegram_templates a partir de
// TELEGRAM_EVENT_TYPES -- asi sumar un evento nuevo en el futuro (agregar
// una entrada al array) no requiere ninguna migracion de datos, se siembra
// solo la primera vez que el admin abre /admin/configuracion.
async function ensureTemplatesSeeded(storeId: string) {
  const existing = await db.select().from(telegramTemplates).where(eq(telegramTemplates.storeId, storeId));
  const existingTypes = new Set(existing.map((row) => row.eventType));
  const missing = TELEGRAM_EVENT_TYPES.filter((def) => !existingTypes.has(def.type));
  if (missing.length === 0) return existing;

  const inserted = await db
    .insert(telegramTemplates)
    .values(
      missing.map((def) => ({
        storeId,
        eventType: def.type,
        enabled: def.defaultEnabled,
        template: def.defaultTemplate,
      })),
    )
    .returning();

  return [...existing, ...inserted];
}

export async function getTelegramSettings() {
  const session = await requireAdmin();

  const [store] = await db.select().from(stores).where(eq(stores.id, session.user.storeId)).limit(1);
  if (!store) throw new Error("Tienda no encontrada.");

  const rows = await ensureTemplatesSeeded(session.user.storeId);

  const templates = TELEGRAM_EVENT_TYPES.map((def) => {
    const row = rows.find((r) => r.eventType === def.type);
    return {
      eventType: def.type,
      label: def.label,
      description: def.description,
      enabled: row?.enabled ?? def.defaultEnabled,
      template: row?.template ?? def.defaultTemplate,
      defaultTemplate: def.defaultTemplate,
    };
  });

  return { ...toPublicSettings(store), templates };
}

export type TelegramSettings = Awaited<ReturnType<typeof getTelegramSettings>>;

export async function updateTelegramSettings(input: z.infer<typeof updateTelegramSettingsSchema>) {
  const session = await requireAdmin();
  const data = updateTelegramSettingsSchema.parse(input);

  const [existing] = await db.select().from(stores).where(eq(stores.id, session.user.storeId)).limit(1);
  if (!existing) throw new Error("Tienda no encontrada.");

  const [updated] = await db
    .update(stores)
    .set({
      ...(data.telegramChatId !== undefined && { telegramChatId: data.telegramChatId || null }),
      // Vacio/ausente = mantener el token que ya habia -- nunca se pisa con
      // nada (mismo criterio que smtpPassword/mpAccessToken).
      ...(data.telegramBotToken && { telegramBotTokenEncrypted: encrypt(data.telegramBotToken) }),
    })
    .where(eq(stores.id, session.user.storeId))
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "update",
    entityType: "telegram_settings",
    entityId: session.user.storeId,
    before: toPublicSettings(existing),
    after: toPublicSettings(updated),
  });

  revalidatePath("/admin/configuracion");
  return toPublicSettings(updated);
}

export async function updateTelegramTemplate(input: z.infer<typeof updateTelegramTemplateSchema>) {
  const session = await requireAdmin();
  const data = updateTelegramTemplateSchema.parse(input);

  await ensureTemplatesSeeded(session.user.storeId);

  const [existing] = await db
    .select()
    .from(telegramTemplates)
    .where(and(eq(telegramTemplates.storeId, session.user.storeId), eq(telegramTemplates.eventType, data.eventType)))
    .limit(1);

  const [updated] = await db
    .update(telegramTemplates)
    .set({ enabled: data.enabled, template: data.template, updatedAt: new Date() })
    .where(and(eq(telegramTemplates.storeId, session.user.storeId), eq(telegramTemplates.eventType, data.eventType)))
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "update",
    entityType: "telegram_template",
    entityId: updated.id,
    before: existing ? { enabled: existing.enabled, template: existing.template } : null,
    after: { enabled: updated.enabled, template: updated.template },
  });

  revalidatePath("/admin/configuracion");
  return updated;
}

export async function sendTestTelegramMessage() {
  const session = await requireAdmin();

  const [store] = await db.select().from(stores).where(eq(stores.id, session.user.storeId)).limit(1);
  if (!store) throw new Error("Tienda no encontrada.");
  if (!store.telegramBotTokenEncrypted || !store.telegramChatId) {
    return {
      success: false as const,
      error: "Falta completar el Bot Token y el ID de Chat antes de poder probarlo.",
    };
  }

  try {
    const botToken = decrypt(store.telegramBotTokenEncrypted);
    const text = renderTelegramTemplate(
      "✅ <b>Prueba de {{storeName}}</b>\nSi ves este mensaje, la conexion con Telegram esta funcionando.",
      { title: "Prueba", storeName: store.name },
    );

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: store.telegramChatId, text, parse_mode: "HTML" }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { success: false as const, error: `Telegram devolvio un error: ${body.slice(0, 200)}` };
    }

    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error desconocido." };
  }
}
