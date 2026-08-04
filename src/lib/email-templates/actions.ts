"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { auditLogs, emailTemplates } from "@/lib/db/schema";
import { EMAIL_EVENT_TYPES } from "./event-types";
import { updateEmailTemplateSchema } from "./schema";

// Admin-only estricto, mismo criterio que telegram/actions.ts: esto controla
// que reciben los clientes por mail en cada compra, no es el molde
// admin+empleado habitual.
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

// Mismo patron que ensureTemplatesSeeded de telegram/actions.ts: crea las
// filas faltantes a partir de EMAIL_EVENT_TYPES, asi sumar un evento nuevo en
// el futuro (agregar una entrada al array) no requiere ninguna migracion de
// datos.
async function ensureTemplatesSeeded(storeId: string) {
  const existing = await db.select().from(emailTemplates).where(eq(emailTemplates.storeId, storeId));
  const existingTypes = new Set(existing.map((row) => row.eventType));
  const missing = EMAIL_EVENT_TYPES.filter((def) => !existingTypes.has(def.type));
  if (missing.length === 0) return existing;

  const inserted = await db
    .insert(emailTemplates)
    .values(
      missing.map((def) => ({
        storeId,
        eventType: def.type,
        enabled: def.defaultEnabled,
        subject: def.defaultSubject,
        html: def.defaultHtml,
      })),
    )
    .returning();

  return [...existing, ...inserted];
}

export async function getEmailTemplates() {
  const session = await requireAdmin();

  const rows = await ensureTemplatesSeeded(session.user.storeId);

  return EMAIL_EVENT_TYPES.map((def) => {
    const row = rows.find((r) => r.eventType === def.type);
    return {
      eventType: def.type,
      label: def.label,
      description: def.description,
      placeholders: def.placeholders,
      enabled: row?.enabled ?? def.defaultEnabled,
      subject: row?.subject ?? def.defaultSubject,
      html: row?.html ?? def.defaultHtml,
      defaultSubject: def.defaultSubject,
      defaultHtml: def.defaultHtml,
    };
  });
}

export type EmailTemplatesList = Awaited<ReturnType<typeof getEmailTemplates>>;

export async function updateEmailTemplate(input: z.infer<typeof updateEmailTemplateSchema>) {
  const session = await requireAdmin();
  const data = updateEmailTemplateSchema.parse(input);

  await ensureTemplatesSeeded(session.user.storeId);

  const [existing] = await db
    .select()
    .from(emailTemplates)
    .where(and(eq(emailTemplates.storeId, session.user.storeId), eq(emailTemplates.eventType, data.eventType)))
    .limit(1);

  const [updated] = await db
    .update(emailTemplates)
    .set({ enabled: data.enabled, subject: data.subject, html: data.html, updatedAt: new Date() })
    .where(and(eq(emailTemplates.storeId, session.user.storeId), eq(emailTemplates.eventType, data.eventType)))
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "update",
    entityType: "email_template",
    entityId: updated.id,
    before: existing ? { enabled: existing.enabled, subject: existing.subject } : null,
    after: { enabled: updated.enabled, subject: updated.subject },
  });

  revalidatePath("/admin/configuracion");
  return updated;
}

// Vuelve una plantilla al HTML/subject por default del codigo -- util si el
// admin edito algo y quiere empezar de nuevo sin tener que copiar/pegar el
// default a mano desde otro lado.
export async function resetEmailTemplateToDefault(eventType: string) {
  const session = await requireAdmin();
  const def = EMAIL_EVENT_TYPES.find((d) => d.type === eventType);
  if (!def) throw new Error("Tipo de evento desconocido.");

  return updateEmailTemplate({ eventType, enabled: def.defaultEnabled, subject: def.defaultSubject, html: def.defaultHtml });
}
