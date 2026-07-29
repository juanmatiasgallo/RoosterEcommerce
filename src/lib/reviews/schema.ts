import { z } from "zod";

export const createReviewSchema = z.object({
  rating: z.number().int().min(1, "La calificacion minima es 1.").max(5, "La calificacion maxima es 5."),
  comment: z.string().max(2000).optional(),
});
