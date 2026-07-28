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
