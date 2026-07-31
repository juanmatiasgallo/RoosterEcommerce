import { z } from "zod";

// Vacio/ausente en telegramBotToken = no tocar el token ya guardado (mismo
// criterio que smtpPassword/mpAccessToken en settings/schema.ts). El chat
// ID no es secreto, asi que vacio SI pisa el valor guardado (permite
// desvincular el chat sin tener que borrar el bot token).
export const updateTelegramSettingsSchema = z.object({
  telegramBotToken: z.string().max(200).optional(),
  telegramChatId: z.union([z.string().max(100), z.literal("")]).optional(),
});

export const updateTelegramTemplateSchema = z.object({
  eventType: z.string().min(1).max(50),
  enabled: z.boolean(),
  template: z.string().min(1).max(2000),
});
