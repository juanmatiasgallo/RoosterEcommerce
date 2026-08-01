import { z } from "zod";

export const updateSmtpSettingsSchema = z.object({
  smtpHost: z.string().max(255).optional(),
  smtpPort: z.number().int().positive().max(65535).optional(),
  smtpUser: z.string().max(255).optional(),
  // Vacio/ausente = no tocar la contrasena ya guardada (ver updateSmtpSettings).
  smtpPassword: z.string().max(500).optional(),
  smtpFromEmail: z.email().optional(),
  smtpFromName: z.string().max(200).optional(),
  smtpSecure: z.boolean().optional(),
});

export const updateMercadoPagoSettingsSchema = z.object({
  mpPublicKey: z.string().max(200).optional(),
  // Vacio/ausente = no tocar el valor ya guardado (mismo criterio que
  // smtpPassword arriba).
  mpAccessToken: z.string().max(500).optional(),
  mpWebhookSecret: z.string().max(500).optional(),
});

// Texto libre, no sensible (se le muestra al cliente tal cual) — a
// diferencia de SMTP/MP arriba, vacio SI pisa el valor guardado (permite
// borrar las instrucciones de un medio para dejar de ofrecerlo).
export const updatePaymentInstructionsSchema = z.object({
  paymentInstructionsTransferencia: z.string().max(2000).optional(),
  paymentInstructionsAbitab: z.string().max(2000).optional(),
  paymentInstructionsRedpagos: z.string().max(2000).optional(),
  paymentInstructionsMiDinero: z.string().max(2000).optional(),
  paymentInstructionsPrex: z.string().max(2000).optional(),
  paymentInstructionsContraentrega: z.string().max(2000).optional(),
});

// Texto libre no sensible, mismo criterio que instructions arriba: vacio SI
// pisa (permite borrar un dato ya cargado).
export const updateStoreInfoSchema = z.object({
  legalName: z.string().max(200).optional(),
  taxId: z.string().max(50).optional(),
  address: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  contactPhone: z.string().max(50).optional(),
  contactEmail: z.union([z.email(), z.literal("")]).optional(),
  instagramUrl: z.union([z.url(), z.literal("")]).optional(),
  facebookUrl: z.union([z.url(), z.literal("")]).optional(),
  invoicePrefix: z.string().max(20).optional(),
  nextInvoiceNumber: z.number().int().positive().optional(),
});

export const updateVacationModeSchema = z.object({
  vacationMode: z.boolean(),
  vacationMessage: z.string().max(1000).optional(),
});

// En 0 el sistema de puntos queda apagado (no se otorgan puntos nuevos, ver
// markOrderAsPaid en src/lib/orders/mark-paid.ts) sin tener que tocar
// codigo. loyaltyPointValue es cuanto vale 1 punto en pesos al canjearlo.
export const updateLoyaltySettingsSchema = z.object({
  loyaltyPointsPer100: z.number().int().min(0).max(10000),
  loyaltyPointValue: z.number().min(0).max(10000),
});

// No son secretos (van igual expuestos en el HTML del sitio, dentro del
// <script> de tracking) -- por eso, a diferencia de mpAccessToken/
// smtpPassword, vacio SI pisa el valor guardado (permite volver a la
// instancia de Umami por defecto de las env vars, o apagar el tracking
// dejando ambos campos vacios sin que exista un Website ID valido).
export const updateUmamiSettingsSchema = z.object({
  umamiWebsiteId: z.string().max(100).optional(),
  umamiScriptUrl: z.union([z.url(), z.literal("")]).optional(),
});

// La URL no es secreta (se puede ver en cualquier request saliente), vacio
// SI la pisa (permite desconectar el webhook sin borrar el secret ya
// guardado). El secret si es sensible -- vacio/ausente = no tocar el que
// ya habia, mismo criterio que mpAccessToken/smtpPassword arriba.
export const updateN8nSettingsSchema = z.object({
  n8nWebhookUrl: z.union([z.url(), z.literal("")]).optional(),
  n8nWebhookSecret: z.string().max(500).optional(),
});

// URL/usuario/ID de lista no son secretos, vacio SI pisa el valor guardado
// (permite desconectar Listmonk sin borrar el token). El token de API si es
// sensible -- vacio/ausente = no tocar el que ya habia, mismo criterio que
// mpAccessToken/smtpPassword/n8nWebhookSecret arriba.
export const updateListmonkSettingsSchema = z.object({
  listmonkUrl: z.union([z.url(), z.literal("")]).optional(),
  listmonkApiUser: z.union([z.string().max(100), z.literal("")]).optional(),
  listmonkApiToken: z.string().max(500).optional(),
  listmonkListId: z.union([z.string().max(100), z.literal("")]).optional(),
});
