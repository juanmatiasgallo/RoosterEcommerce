"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { auditLogs, stores } from "@/lib/db/schema";
import { encrypt } from "@/lib/crypto";
import { sendMail } from "@/lib/mail";
import {
  updateMercadoPagoSettingsSchema,
  updatePaymentInstructionsSchema,
  updateSmtpSettingsSchema,
  updateStoreInfoSchema,
  updateVacationModeSchema,
} from "./schema";

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

// Nunca se expone el access token ni el webhook secret reales (ni
// encriptados) al frontend ni a audit_logs — solo si estan seteados o no,
// mismo criterio que toPublicSettings de arriba para SMTP.
function toPublicMpSettings(store: typeof stores.$inferSelect) {
  return {
    mpPublicKey: store.mpPublicKey,
    mpAccessTokenSet: Boolean(store.mpAccessTokenEncrypted),
    mpWebhookSecretSet: Boolean(store.mpWebhookSecretEncrypted),
  };
}

export async function getMercadoPagoSettings() {
  const session = await requireAdmin();

  const [store] = await db.select().from(stores).where(eq(stores.id, session.user.storeId)).limit(1);
  if (!store) throw new Error("Tienda no encontrada.");

  return toPublicMpSettings(store);
}

export type MercadoPagoSettings = Awaited<ReturnType<typeof getMercadoPagoSettings>>;

export async function updateMercadoPagoSettings(input: z.infer<typeof updateMercadoPagoSettingsSchema>) {
  const session = await requireAdmin();
  const data = updateMercadoPagoSettingsSchema.parse(input);

  const [existing] = await db.select().from(stores).where(eq(stores.id, session.user.storeId)).limit(1);
  if (!existing) throw new Error("Tienda no encontrada.");

  const [updated] = await db
    .update(stores)
    .set({
      ...(data.mpPublicKey !== undefined && { mpPublicKey: data.mpPublicKey }),
      // Si el campo vino vacio/ausente en el form, se mantiene el valor que
      // ya habia guardado — nunca se pisa con nada (mismo criterio que
      // smtpPassword en updateSmtpSettings).
      ...(data.mpAccessToken && { mpAccessTokenEncrypted: encrypt(data.mpAccessToken) }),
      ...(data.mpWebhookSecret && { mpWebhookSecretEncrypted: encrypt(data.mpWebhookSecret) }),
    })
    .where(eq(stores.id, session.user.storeId))
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "update",
    entityType: "mercadopago_settings",
    entityId: session.user.storeId,
    before: toPublicMpSettings(existing),
    after: toPublicMpSettings(updated),
  });

  revalidatePath("/admin/configuracion");

  return toPublicMpSettings(updated);
}

function toPublicPaymentInstructions(store: typeof stores.$inferSelect) {
  return {
    paymentInstructionsTransferencia: store.paymentInstructionsTransferencia,
    paymentInstructionsAbitab: store.paymentInstructionsAbitab,
    paymentInstructionsRedpagos: store.paymentInstructionsRedpagos,
    paymentInstructionsMiDinero: store.paymentInstructionsMiDinero,
    paymentInstructionsPrex: store.paymentInstructionsPrex,
    paymentInstructionsContraentrega: store.paymentInstructionsContraentrega,
  };
}

export async function getPaymentInstructions() {
  const session = await requireAdmin();

  const [store] = await db.select().from(stores).where(eq(stores.id, session.user.storeId)).limit(1);
  if (!store) throw new Error("Tienda no encontrada.");

  return toPublicPaymentInstructions(store);
}

export type PaymentInstructionsSettings = Awaited<ReturnType<typeof getPaymentInstructions>>;

export async function updatePaymentInstructions(input: z.infer<typeof updatePaymentInstructionsSchema>) {
  const session = await requireAdmin();
  const data = updatePaymentInstructionsSchema.parse(input);

  const [existing] = await db.select().from(stores).where(eq(stores.id, session.user.storeId)).limit(1);
  if (!existing) throw new Error("Tienda no encontrada.");

  const [updated] = await db
    .update(stores)
    .set({
      // A diferencia de SMTP/MP, vacio SI pisa (permite borrar y dejar de
      // ofrecer ese medio) — por eso se compara contra undefined, no contra
      // el string vacio.
      ...(data.paymentInstructionsTransferencia !== undefined && {
        paymentInstructionsTransferencia: data.paymentInstructionsTransferencia || null,
      }),
      ...(data.paymentInstructionsAbitab !== undefined && {
        paymentInstructionsAbitab: data.paymentInstructionsAbitab || null,
      }),
      ...(data.paymentInstructionsRedpagos !== undefined && {
        paymentInstructionsRedpagos: data.paymentInstructionsRedpagos || null,
      }),
      ...(data.paymentInstructionsMiDinero !== undefined && {
        paymentInstructionsMiDinero: data.paymentInstructionsMiDinero || null,
      }),
      ...(data.paymentInstructionsPrex !== undefined && {
        paymentInstructionsPrex: data.paymentInstructionsPrex || null,
      }),
      ...(data.paymentInstructionsContraentrega !== undefined && {
        paymentInstructionsContraentrega: data.paymentInstructionsContraentrega || null,
      }),
    })
    .where(eq(stores.id, session.user.storeId))
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "update",
    entityType: "payment_instructions",
    entityId: session.user.storeId,
    before: toPublicPaymentInstructions(existing),
    after: toPublicPaymentInstructions(updated),
  });

  revalidatePath("/admin/configuracion");
  revalidatePath("/carrito");

  return toPublicPaymentInstructions(updated);
}

function toPublicStoreInfo(store: typeof stores.$inferSelect) {
  return {
    legalName: store.legalName,
    taxId: store.taxId,
    address: store.address,
    city: store.city,
    department: store.department,
    contactPhone: store.contactPhone,
    contactEmail: store.contactEmail,
    invoicePrefix: store.invoicePrefix,
    nextInvoiceNumber: store.nextInvoiceNumber,
  };
}

export async function getStoreInfo() {
  const session = await requireAdmin();

  const [store] = await db.select().from(stores).where(eq(stores.id, session.user.storeId)).limit(1);
  if (!store) throw new Error("Tienda no encontrada.");

  return toPublicStoreInfo(store);
}

export type StoreInfoSettings = Awaited<ReturnType<typeof getStoreInfo>>;

// Publica (no admin-gated): el footer y /quienes-somos muestran el
// contacto real de la tienda si esta cargado, sin requerir sesion de admin.
export async function getPublicStoreContact() {
  const [store] = await db
    .select({ contactEmail: stores.contactEmail, contactPhone: stores.contactPhone })
    .from(stores)
    .limit(1);

  return store ?? { contactEmail: null, contactPhone: null };
}

export async function updateStoreInfo(input: z.infer<typeof updateStoreInfoSchema>) {
  const session = await requireAdmin();
  const data = updateStoreInfoSchema.parse(input);

  const [existing] = await db.select().from(stores).where(eq(stores.id, session.user.storeId)).limit(1);
  if (!existing) throw new Error("Tienda no encontrada.");

  const [updated] = await db
    .update(stores)
    .set({
      ...(data.legalName !== undefined && { legalName: data.legalName || null }),
      ...(data.taxId !== undefined && { taxId: data.taxId || null }),
      ...(data.address !== undefined && { address: data.address || null }),
      ...(data.city !== undefined && { city: data.city || null }),
      ...(data.department !== undefined && { department: data.department || null }),
      ...(data.contactPhone !== undefined && { contactPhone: data.contactPhone || null }),
      ...(data.contactEmail !== undefined && { contactEmail: data.contactEmail || null }),
      ...(data.invoicePrefix !== undefined && { invoicePrefix: data.invoicePrefix || null }),
      ...(data.nextInvoiceNumber !== undefined && { nextInvoiceNumber: data.nextInvoiceNumber }),
    })
    .where(eq(stores.id, session.user.storeId))
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "update",
    entityType: "store_info",
    entityId: session.user.storeId,
    before: toPublicStoreInfo(existing),
    after: toPublicStoreInfo(updated),
  });

  revalidatePath("/admin/configuracion");
  revalidatePath("/quienes-somos");
  revalidatePath("/ayuda");

  return toPublicStoreInfo(updated);
}

// Publico (no admin-gated): el sitio necesita saber si esta en modo
// vacaciones para bloquear "Ir a pagar" en /carrito y /pedido-a-medida y
// mostrar el mensaje, sin requerir sesion de admin para leerlo.
export async function getVacationStatus() {
  const [store] = await db
    .select({ vacationMode: stores.vacationMode, vacationMessage: stores.vacationMessage })
    .from(stores)
    .limit(1);

  return store ?? { vacationMode: false, vacationMessage: null };
}

export async function getVacationSettings() {
  const session = await requireAdmin();

  const [store] = await db.select().from(stores).where(eq(stores.id, session.user.storeId)).limit(1);
  if (!store) throw new Error("Tienda no encontrada.");

  return { vacationMode: store.vacationMode, vacationMessage: store.vacationMessage };
}

export async function updateVacationMode(input: z.infer<typeof updateVacationModeSchema>) {
  const session = await requireAdmin();
  const data = updateVacationModeSchema.parse(input);

  const [existing] = await db.select().from(stores).where(eq(stores.id, session.user.storeId)).limit(1);
  if (!existing) throw new Error("Tienda no encontrada.");

  const [updated] = await db
    .update(stores)
    .set({
      vacationMode: data.vacationMode,
      vacationMessage: data.vacationMessage || null,
    })
    .where(eq(stores.id, session.user.storeId))
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "update",
    entityType: "vacation_mode",
    entityId: session.user.storeId,
    before: { vacationMode: existing.vacationMode, vacationMessage: existing.vacationMessage },
    after: { vacationMode: updated.vacationMode, vacationMessage: updated.vacationMessage },
  });

  revalidatePath("/admin/configuracion");
  revalidatePath("/carrito");
  revalidatePath("/pedido-a-medida");
  revalidatePath("/");

  return { vacationMode: updated.vacationMode, vacationMessage: updated.vacationMessage };
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
