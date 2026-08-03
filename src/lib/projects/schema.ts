import { z } from "zod";
import { PROJECT_THEME_KEYS, type ProjectThemeKey } from "./theme-registry";

// z.enum pide una tupla no vacia ([string, ...string[]]), no un array
// generico -- PROJECT_THEME_KEYS es un array construido en runtime
// (Object.keys), asi que hay que afirmar la forma de tupla a mano.
const themeKeysTuple = PROJECT_THEME_KEYS as [ProjectThemeKey, ...ProjectThemeKey[]];

export const createProjectSchema = z.object({
  title: z.string().min(1, "Requerido").max(200),
  // Soporta Markdown (task #147) -- limite subido de 2000 a 4000, ver
  // comentario en db/schema.ts.
  description: z.string().max(4000).optional().or(z.literal("")),
  // "" en vez de undefined = "sin tematica" en el <select> del form -- se
  // normaliza a null antes de guardar (ver actions.ts).
  theme: z.union([z.literal(""), z.enum(themeKeysTuple)]).optional(),
  featured: z.boolean().optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export const reorderProjectsSchema = z.array(z.object({ id: z.uuid(), position: z.number().int().min(0) })).min(1);

// Mismas extensiones que catalogo (src/lib/catalog/schema.ts): la galeria
// de proyectos solo necesita fotos, no video.
export const UPLOAD_PROJECT_IMAGE_ALLOWED_EXTENSIONS: string[] = ["jpg", "jpeg", "png", "webp"];
