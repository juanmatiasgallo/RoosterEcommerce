import { z } from "zod";

export const shippingAddressSchema = z.object({
  calle: z.string().min(1, "Requerido").max(200),
  numero: z.string().min(1, "Requerido").max(20),
  piso: z.string().max(50).optional(),
  ciudad: z.string().min(1, "Requerido").max(100),
  departamento: z.string().min(1, "Requerido").max(100),
  cp: z.string().min(1, "Requerido").max(20),
});

export type ShippingAddress = z.infer<typeof shippingAddressSchema>;
