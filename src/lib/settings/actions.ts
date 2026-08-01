"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import type { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { auditLogs, stores } from "@/lib/db/schema";
import { encrypt, decrypt } from "@/lib/crypto";
import { sendMail } from "@/lib/mail";
import { sendN8nWebhook } from "@/lib/webhooks/send";
import {
  updateListmonkSettingsSchema,
  updateLoyaltySettingsSchema,
  updateMercadoPagoSettingsSchema,
  updateN8nSettingsSchema,
  updatePaymentInstructionsSchema,
  updateSmtpSettingsSchema,
  updateStoreInfoSchema,
  updateUmamiSettingsSchema,
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
    instagramUrl: store.instagramUrl,
    facebookUrl: store.facebookUrl,
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
    .select({
      contactEmail: stores.contactEmail,
      contactPhone: stores.contactPhone,
      instagramUrl: stores.instagramUrl,
      facebookUrl: stores.facebookUrl,
    })
    .from(stores)
    .limit(1);

  return store ?? { contactEmail: null, contactPhone: null, instagramUrl: null, facebookUrl: null };
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
      ...(data.instagramUrl !== undefined && { instagramUrl: data.instagramUrl || null }),
      ...(data.facebookUrl !== undefined && { facebookUrl: data.facebookUrl || null }),
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

function toPublicLoyaltySettings(store: typeof stores.$inferSelect) {
  return {
    loyaltyPointsPer100: store.loyaltyPointsPer100,
    loyaltyPointValue: Number(store.loyaltyPointValue),
  };
}

export async function getLoyaltySettings() {
  const session = await requireAdmin();

  const [store] = await db.select().from(stores).where(eq(stores.id, session.user.storeId)).limit(1);
  if (!store) throw new Error("Tienda no encontrada.");

  return toPublicLoyaltySettings(store);
}

export type LoyaltySettings = Awaited<ReturnType<typeof getLoyaltySettings>>;

// Publica (no admin-gated): /mi-cuenta/puntos necesita saber cuanto vale un
// punto en pesos para mostrar el canje, sin requerir sesion de admin.
export async function getPublicLoyaltyRates() {
  const [store] = await db
    .select({ loyaltyPointsPer100: stores.loyaltyPointsPer100, loyaltyPointValue: stores.loyaltyPointValue })
    .from(stores)
    .limit(1);

  return store
    ? { loyaltyPointsPer100: store.loyaltyPointsPer100, loyaltyPointValue: Number(store.loyaltyPointValue) }
    : { loyaltyPointsPer100: 0, loyaltyPointValue: 0 };
}

export async function updateLoyaltySettings(input: z.infer<typeof updateLoyaltySettingsSchema>) {
  const session = await requireAdmin();
  const data = updateLoyaltySettingsSchema.parse(input);

  const [existing] = await db.select().from(stores).where(eq(stores.id, session.user.storeId)).limit(1);
  if (!existing) throw new Error("Tienda no encontrada.");

  const [updated] = await db
    .update(stores)
    .set({
      loyaltyPointsPer100: data.loyaltyPointsPer100,
      loyaltyPointValue: data.loyaltyPointValue.toFixed(2),
    })
    .where(eq(stores.id, session.user.storeId))
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "update",
    entityType: "loyalty_settings",
    entityId: session.user.storeId,
    before: toPublicLoyaltySettings(existing),
    after: toPublicLoyaltySettings(updated),
  });

  revalidatePath("/admin/configuracion");

  return toPublicLoyaltySettings(updated);
}

function toPublicUmamiSettings(store: typeof stores.$inferSelect) {
  return {
    umamiWebsiteId: store.umamiWebsiteId,
    umamiScriptUrl: store.umamiScriptUrl,
  };
}

export async function getUmamiSettings() {
  const session = await requireAdmin();

  const [store] = await db.select().from(stores).where(eq(stores.id, session.user.storeId)).limit(1);
  if (!store) throw new Error("Tienda no encontrada.");

  return toPublicUmamiSettings(store);
}

export type UmamiSettings = Awaited<ReturnType<typeof getUmamiSettings>>;

export async function updateUmamiSettings(input: z.infer<typeof updateUmamiSettingsSchema>) {
  const session = await requireAdmin();
  const data = updateUmamiSettingsSchema.parse(input);

  const [existing] = await db.select().from(stores).where(eq(stores.id, session.user.storeId)).limit(1);
  if (!existing) throw new Error("Tienda no encontrada.");

  const [updated] = await db
    .update(stores)
    .set({
      // Vacio SI pisa (ver comentario en updateUmamiSettingsSchema) — a
      // diferencia de mpAccessToken/smtpPassword, esto no es un secreto.
      ...(data.umamiWebsiteId !== undefined && { umamiWebsiteId: data.umamiWebsiteId || null }),
      ...(data.umamiScriptUrl !== undefined && { umamiScriptUrl: data.umamiScriptUrl || null }),
    })
    .where(eq(stores.id, session.user.storeId))
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "update",
    entityType: "umami_settings",
    entityId: session.user.storeId,
    before: toPublicUmamiSettings(existing),
    after: toPublicUmamiSettings(updated),
  });

  revalidatePath("/admin/configuracion");
  // El layout raiz (donde vive UmamiScript) no es admin-only, hay que
  // revalidar el arbol entero para que el nuevo Website ID/URL se refleje
  // en el sitio publico sin esperar a que expire el cache por otro motivo.
  revalidatePath("/", "layout");

  return toPublicUmamiSettings(updated);
}

// Publica (no admin-gated): la usa el layout raiz para decidir que
// Website ID/URL de script pasarle a UmamiScript. DB primero (cargado desde
// /admin/configuracion), y si la tienda no tiene nada seteado ahi, se cae a
// las env vars NEXT_PUBLIC_UMAMI_WEBSITE_ID / NEXT_PUBLIC_UMAMI_SRC del
// deploy actual -- mismo criterio que mpAccessTokenEncrypted cayendo a
// MP_ACCESS_TOKEN. Este fallback es lo que permite replicar el patron en
// otro cliente/implementacion sin tocar codigo: alcanza con cargar sus
// datos de Umami en /admin/configuracion (o, si se prefiere, solo con env
// vars, sin tocar la base).
export async function getPublicUmamiConfig() {
  const [store] = await db
    .select({ umamiWebsiteId: stores.umamiWebsiteId, umamiScriptUrl: stores.umamiScriptUrl })
    .from(stores)
    .limit(1);

  return {
    websiteId: store?.umamiWebsiteId || process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID || null,
    scriptUrl: store?.umamiScriptUrl || process.env.NEXT_PUBLIC_UMAMI_SRC || null,
  };
}

// Nunca se expone el secret real (ni encriptado) al frontend ni a
// audit_logs -- mismo criterio que smtpPasswordSet/mpAccessTokenSet.
function toPublicN8nSettings(store: typeof stores.$inferSelect) {
  return {
    n8nWebhookUrl: store.n8nWebhookUrl,
    n8nWebhookSecretSet: Boolean(store.n8nWebhookSecretEncrypted),
  };
}

export async function getN8nSettings() {
  const session = await requireAdmin();

  const [store] = await db.select().from(stores).where(eq(stores.id, session.user.storeId)).limit(1);
  if (!store) throw new Error("Tienda no encontrada.");

  return toPublicN8nSettings(store);
}

export type N8nSettings = Awaited<ReturnType<typeof getN8nSettings>>;

export async function updateN8nSettings(input: z.infer<typeof updateN8nSettingsSchema>) {
  const session = await requireAdmin();
  const data = updateN8nSettingsSchema.parse(input);

  const [existing] = await db.select().from(stores).where(eq(stores.id, session.user.storeId)).limit(1);
  if (!existing) throw new Error("Tienda no encontrada.");

  const [updated] = await db
    .update(stores)
    .set({
      // La URL no es secreta, vacio SI la pisa (permite desconectar el
      // webhook). El secret si es sensible -- vacio/ausente = mantener el
      // que ya habia, mismo criterio que mpAccessToken/smtpPassword.
      ...(data.n8nWebhookUrl !== undefined && { n8nWebhookUrl: data.n8nWebhookUrl || null }),
      ...(data.n8nWebhookSecret && { n8nWebhookSecretEncrypted: encrypt(data.n8nWebhookSecret) }),
    })
    .where(eq(stores.id, session.user.storeId))
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "update",
    entityType: "n8n_webhook_settings",
    entityId: session.user.storeId,
    before: toPublicN8nSettings(existing),
    after: toPublicN8nSettings(updated),
  });

  revalidatePath("/admin/configuracion");
  return toPublicN8nSettings(updated);
}

export async function sendTestN8nWebhook() {
  const session = await requireAdmin();

  const [store] = await db.select().from(stores).where(eq(stores.id, session.user.storeId)).limit(1);
  if (!store) throw new Error("Tienda no encontrada.");
  if (!store.n8nWebhookUrl) {
    return { success: false as const, error: "Falta cargar la URL del webhook antes de poder probarlo." };
  }

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (store.n8nWebhookSecretEncrypted) {
      headers["X-Webhook-Secret"] = decrypt(store.n8nWebhookSecretEncrypted);
    }

    const res = await fetch(store.n8nWebhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        type: "test",
        title: "Prueba de webhook",
        body: `Si ves esto en tu flujo de n8n, la conexion con ${store.name} esta funcionando.`,
        link: null,
        storeName: store.name,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { success: false as const, error: `El webhook devolvio un error: ${res.status} ${body.slice(0, 200)}` };
    }
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error desconocido." };
  }
}

// Nunca se expone el token real (ni encriptado), mismo criterio que
// n8nWebhookSecretSet arriba.
function toPublicListmonkSettings(store: typeof stores.$inferSelect) {
  return {
    listmonkUrl: store.listmonkUrl,
    listmonkApiUser: store.listmonkApiUser,
    listmonkApiTokenSet: Boolean(store.listmonkApiTokenEncrypted),
    listmonkListId: store.listmonkListId,
  };
}

export async function getListmonkSettings() {
  const session = await requireAdmin();

  const [store] = await db.select().from(stores).where(eq(stores.id, session.user.storeId)).limit(1);
  if (!store) throw new Error("Tienda no encontrada.");

  return toPublicListmonkSettings(store);
}

export type ListmonkSettings = Awaited<ReturnType<typeof getListmonkSettings>>;

export async function updateListmonkSettings(input: z.infer<typeof updateListmonkSettingsSchema>) {
  const session = await requireAdmin();
  const data = updateListmonkSettingsSchema.parse(input);

  const [existing] = await db.select().from(stores).where(eq(stores.id, session.user.storeId)).limit(1);
  if (!existing) throw new Error("Tienda no encontrada.");

  const [updated] = await db
    .update(stores)
    .set({
      ...(data.listmonkUrl !== undefined && { listmonkUrl: data.listmonkUrl || null }),
      ...(data.listmonkApiUser !== undefined && { listmonkApiUser: data.listmonkApiUser || null }),
      ...(data.listmonkApiToken && { listmonkApiTokenEncrypted: encrypt(data.listmonkApiToken) }),
      ...(data.listmonkListId !== undefined && { listmonkListId: data.listmonkListId || null }),
    })
    .where(eq(stores.id, session.user.storeId))
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "update",
    entityType: "listmonk_settings",
    entityId: session.user.storeId,
    before: toPublicListmonkSettings(existing),
    after: toPublicListmonkSettings(updated),
  });

  revalidatePath("/admin/configuracion");
  return toPublicListmonkSettings(updated);
}

// Prueba la conexion pidiendo el detalle de la lista configurada (GET, no
// modifica nada) -- confirma de una que la URL, las credenciales y el ID de
// lista son correctos, sin tocar suscriptores reales.
export async function sendTestListmonkConnection() {
  const session = await requireAdmin();

  const [store] = await db.select().from(stores).where(eq(stores.id, session.user.storeId)).limit(1);
  if (!store) throw new Error("Tienda no encontrada.");
  if (!store.listmonkUrl || !store.listmonkApiUser || !store.listmonkApiTokenEncrypted || !store.listmonkListId) {
    return { success: false as const, error: "Falta completar la configuracion de Listmonk antes de poder probarla." };
  }

  try {
    const token = decrypt(store.listmonkApiTokenEncrypted);
    const auth = Buffer.from(`${store.listmonkApiUser}:${token}`).toString("base64");
    const url = `${store.listmonkUrl.replace(/\/$/, "")}/api/lists/${store.listmonkListId}`;

    const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { success: false as const, error: `Listmonk devolvio un error: ${res.status} ${body.slice(0, 200)}` };
    }
    const json = (await res.json()) as { data?: { name?: string } };
    return { success: true as const, listName: json.data?.name ?? store.listmonkListId };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error desconocido." };
  }
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

/**
 * Prueba deliberada del pipe de GlitchTip (task #86): manda una excepcion
 * de prueba directo con Sentry.captureException en vez de dejarla escapar
 * sin capturar -- asi confirmamos DSN + env vars funcionando sin depender
 * de onRequestError (que solo se dispara con errores realmente no
 * atrapados) ni de esperar a que ocurra un error real en produccion.
 */
export async function sendTestErrorToGlitchTip() {
  await requireAdmin();

  // Diagnostico (task #86): si esto imprime "false", el cliente de Sentry
  // nunca se inicializo (sin GLITCHTIP_DSN en este proceso) -- captureException
  // igual devuelve un eventId aunque sea un no-op, por eso no alcanza con el
  // toast de "enviado" del lado del cliente para confirmar que llego.
  console.log("[GlitchTip test] Sentry client presente:", Boolean(Sentry.getClient()));

  const eventId = Sentry.captureException(
    new Error("Prueba manual desde /admin/configuracion — si ves esto en GlitchTip, la integracion funciona."),
  );

  // Sentry.init hace flush async en background; sin esto el proceso de la
  // Server Action puede terminar (y el runtime "congelar" el contexto)
  // antes de que el evento realmente salga por la red.
  const flushed = await Sentry.flush(5000);
  console.log("[GlitchTip test] flush exitoso:", flushed, "eventId:", eventId);

  return { success: true as const, eventId };
}
