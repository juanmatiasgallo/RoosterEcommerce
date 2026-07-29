import { z } from "zod";

export const redeemLoyaltyPointsSchema = z.object({
  points: z.number().int().min(1),
});
