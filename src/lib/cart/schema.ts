import { z } from "zod";

export const addToCartSchema = z.object({
  variantId: z.uuid(),
  quantity: z.number().int().positive(),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive(),
});
