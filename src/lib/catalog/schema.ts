import { z } from "zod";

// Fila libre de especificacion ("Material" / "PLA biodegradable", etc.) —
// se muestran en la pestana "Detalles del producto" de la ficha publica,
// separadas de `description` (texto libre de la pestana "Descripcion").
export const productSpecSchema = z.object({
  label: z.string().min(1).max(80),
  value: z.string().min(1).max(300),
});

export const createProductSchema = z.object({
  slug: z.string().min(1).max(220),
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  categoryId: z.uuid().optional(),
  basePrice: z.number().positive(),
  specs: z.array(productSpecSchema).max(30).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const createVariantSchema = z.object({
  productId: z.uuid(),
  material: z.string().min(1).max(50),
  color: z.string().max(50).optional(),
  size: z.string().max(50).optional(),
  price: z.number().positive(),
  stock: z.number().int().min(0),
  sku: z.string().max(100).optional(),
});

export const updateVariantSchema = createVariantSchema.omit({ productId: true }).partial();

export const createCategorySchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(220),
  parentId: z.uuid().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const reorderCategoriesSchema = z
  .array(z.object({ id: z.uuid(), position: z.number().int().min(0) }))
  .min(1);

export const UPLOAD_IMAGE_ALLOWED_EXTENSIONS: string[] = ["jpg", "jpeg", "png", "webp"];

export const uploadProductImageSchema = z.object({
  productId: z.uuid(),
});

export const reorderProductImagesSchema = z
  .array(z.object({ id: z.uuid(), position: z.number().int().min(0) }))
  .min(1);

export const deleteProductImageSchema = z.object({
  id: z.uuid(),
});
