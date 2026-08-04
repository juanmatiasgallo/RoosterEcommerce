import { z } from "zod";

export const updateEmailTemplateSchema = z.object({
  eventType: z.string().min(1).max(50),
  enabled: z.boolean(),
  subject: z.string().min(1).max(200),
  html: z.string().min(1).max(20000),
});
