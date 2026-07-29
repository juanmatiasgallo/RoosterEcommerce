import { z } from "zod";

export const subscribeToNewsletterSchema = z.object({
  email: z.email("Ingresa un email valido."),
});
