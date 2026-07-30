import { z } from "zod";

export const askProductQuestionSchema = z.object({
  productId: z.uuid(),
  message: z.string().min(3, "Escribi al menos unas palabras.").max(2000),
});

export const replyInquirySchema = z.object({
  inquiryId: z.uuid(),
  message: z.string().min(1, "Requerido").max(2000),
});
