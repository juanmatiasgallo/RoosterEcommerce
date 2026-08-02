import { z } from "zod";

export const CUSTOM_ORDER_ALLOWED_EXTENSIONS: string[] = ["stl", "obj"];

export const createCustomOrderSchema = z.object({
  material: z.string().max(50).optional(),
  color: z.string().max(50).optional(),
  quantity: z.number().int().positive(),
  approxSize: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
});

export const quoteCustomOrderSchema = z.object({
  quotedPrice: z.number().positive(),
  quotedNotes: z.string().max(2000).optional(),
  // String "YYYY-MM-DD" tal cual sale de un <input type="date"> -- se
  // convierte a Date recien en quoteCustomOrder (ver custom-orders/actions.ts),
  // no aca, para no atarse a un formato de Date en el form. Opcional: si el
  // admin no carga plazo, la cotizacion no vence sola.
  quoteValidUntil: z.string().optional(),
});
