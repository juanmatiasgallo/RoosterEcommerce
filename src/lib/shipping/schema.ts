import { z } from "zod";

export const createShippingZoneSchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().max(1000).optional(),
  cost: z.number().min(0),
});

export const updateShippingZoneSchema = createShippingZoneSchema.partial().extend({
  active: z.boolean().optional(),
});

export const reorderShippingZonesSchema = z.array(z.object({ id: z.uuid(), position: z.number().int().min(0) })).min(1);
