"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { auditLogs, stores } from "@/lib/db/schema";
import { encrypt } from "@/lib/crypto";
import { sendMail } from "@/lib/mail";
import { updateSmtpSettingsSchema } from "./schema";

// A diferencia del molde CRUD habitual (admin + empleado), la config SMTP
// son credenciales reales de un proveedor de correo para toda la tienda —
// mas sensible que un CRUD de catalogo, por eso el guard es admin-only
// (empleado no puede ni ver ni tocar esto).
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

// Nunca se expone el password real (ni encriptado) al frontend ni a
// audit_logs — solo si esta seteado o no.
function toPublicSettings(store: typeof stores.$inferSelect) {
  return {
    smtpHost: store.smtpHost,
    smtpPort: store.smtpPort,
    smtpUser: store.smtpUser,
    smtpFromEmail: store.smtpFromEmail,
    smtpFromName: store.smtpFromName,
    smtpSecure: store.smtpSecure,
    smtpPasswordSet: Boolean(store.smtpPasswordEncrypted),
  };
}

export async function getSmtpSettings() {
  const session = await requireAdmin();

  const [store] = await db.select().from(stores).where(eq(stores.id, session.user.storeId)).limit(1);
  if (!store) throw new Error("Tienda no encontrada.");

  return toPublicSettings(store);
}

export type SmtpSettings = Awaited<ReturnType<typeof getSmtpSettings>>;

export async function updateSmtpSettings(input: z.infer<typeof updateSmtpSettingsSchema>) {
  const session = await requireAdmin();
  const data = updateSmtpSettingsSchema.parse(input);

  const [existing] = await db.select().from(stores).where(eq(stores.id, session.user.storeId)).limit(1);
  if (!existing) throw new Error("Tienda no encontrada.");

  const [updated] = await db
    .update(stores)
    .set({
      ...(data.smtpHost !== undefined && { smtpHost: data.smtpHost }),
      ...(data.smtpPort !== undefined && { smtpPort: data.smtpPort }),
      ...(data.smtpUser !== undefined && { smtpUser: data.smtpUser }),
      // Si el campo vino vacio/ausente en el form, se mantiene la
      // contrasena que ya habia guardada — nunca se pisa con nada.
      ...(data.smtpPassword && { smtpPasswordEncrypted: encrypt(data.smtpPassword) }),
      ...(data.smtpFromEmail !== undefined && { smtpFromEmail: data.smtpFromEmail }),
      ...(data.smtpFromName !== undefined && { smtpFromName: data.smtpFromName }),
      ...(data.smtpSecure !== undefined && { smtpSecure: data.smtpSecure }),
    })
    .where(eq(stores.id, session.user.storeId))
    .returning();

  // before/after quedan redactados (smtpPasswordSet: boolean) — el
  // password, ni siquiera encriptado, se duplica en audit_logs.
  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "update",
    entityType: "smtp_settings",
    entityId: session.user.storeId,
    before: toPublicSettings(existing),
    after: toPublicSettings(updated),
  });

  revalidatePath("/admin/configuracion");

  return toPublicSettings(updated);
}

export async function sendTestEmail() {
  const session = await requireAdmin();

  const [store] = await db.select().from(stores).where(eq(stores.id, session.user.storeId)).limit(1);
  if (!store) throw new Error("Tienda no encontrada.");
  if (!store.smtpFromEmail) {
    throw new Error("Falta completar la configuracion SMTP antes de poder probarla.");
  }

  const result = await sendMail({
    storeId: session.user.storeId,
    to: store.smtpFromEmail,
    subject: "Email de prueba — Tienda 3D",
    text: "Este es un email de prueba de la configuracion SMTP de tu tienda.",
  });

  if (result.status === "sent") return { success: true as const };
  if (result.status === "not_configured") {
    return { success: false as const, error: "Falta completar la configuracion SMTP antes de poder probarla." };
  }
  return { success: false as const, error: result.error };
}
