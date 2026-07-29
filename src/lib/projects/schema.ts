import { z } from "zod";

export const createProjectSchema = z.object({
  title: z.string().min(1, "Requerido").max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
});

export const updateProjectSchema = createProjectSchema.partial();

export const reorderProjectsSchema = z.array(z.object({ id: z.uuid(), position: z.number().int().min(0) })).min(1);

// Mismas extensiones que catalogo (src/lib/catalog/schema.ts): la galeria
// de proyectos solo necesita fotos, no video.
export const UPLOAD_PROJECT_IMAGE_ALLOWED_EXTENSIONS: string[] = ["jpg", "jpeg", "png", "webp"];
