import { z } from "zod";

// Sin .default(...) en ningun campo (mismo motivo que
// src/lib/site-content/schema.ts): rompe la inferencia de tipos de
// zodResolver + useForm en el formulario del admin.
export const createDiscountCampaignSchema = z
  .object({
    code: z.string().min(3).max(30),
    type: z.enum(["percent", "fixed"]),
    value: z.number().positive(),
    usageLimit: z.number().int().positive().optional(),
  })
  .refine((data) => data.type !== "percent" || data.value <= 100, {
    message: "Un descuento porcentual no puede superar 100.",
    path: ["value"],
  });

export const updateDiscountCampaignSchema = z.object({
  type: z.enum(["percent", "fixed"]).optional(),
  value: z.number().positive().optional(),
  usageLimit: z.number().int().positive().optional(),
  active: z.boolean().optional(),
});
