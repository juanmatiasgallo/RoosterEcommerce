"use server";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, asc, desc, eq, exists, ilike, inArray, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { auth } from "@/auth";
import type { Role } from "@/lib/auth/schema";
import { db } from "@/lib/db";
import { auditLogs, categories, productImages, products, productVariants } from "@/lib/db/schema";
import { listProducts, listProductsByIds } from "./queries";
import {
  createCategorySchema,
  createProductSchema,
  createVariantSchema,
  deleteProductImageSchema,
  reorderCategoriesSchema,
  reorderProductImagesSchema,
  updateCategorySchema,
  updateProductSchema,
  updateVariantSchema,
  uploadProductImageSchema,
  UPLOAD_IMAGE_ALLOWED_EXTENSIONS,
  UPLOAD_VIDEO_ALLOWED_EXTENSIONS,
} from "./schema";

const STAFF_ROLES: Role[] = ["admin", "empleado"];

async function requireStaff() {
  const session = await auth();
  if (!session || !STAFF_ROLES.includes(session.user.role)) {
    throw new Error("No autorizado.");
  }
  return session;
}

async function logAudit(params: {
  userId: string;
  storeId: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
}) {
  await db.insert(auditLogs).values({
    storeId: params.storeId,
    userId: params.userId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    before: params.before ?? null,
    after: params.after ?? null,
  });
}

async function getOwnedProduct(productId: string, storeId: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.storeId, storeId)))
    .limit(1);
  return product;
}

// --- Productos --------------------------------------------------------

// queries.ts (listProducts) es de lectura publica y siempre filtra
// products.active = true, pensada para el catalogo; el panel admin necesita
// ver tambien los productos archivados para poder gestionarlos, asi que esta
// query vive aca (guardada con requireStaff) en vez de forzar ese caso dentro
// de listProducts.
export async function listProductsForAdmin(search?: string) {
  const session = await requireStaff();

  const conditions = [eq(products.storeId, session.user.storeId)];
  if (search) {
    // Mismo criterio que listProducts() (catalog/queries.ts): matchear
    // tambien descripcion y SKU/material/color de variantes, no solo el
    // nombre -- el admin necesita poder buscar un producto por su SKU.
    const term = `%${search}%`;
    const searchCondition = or(
      ilike(products.name, term),
      ilike(products.description, term),
      exists(
        db
          .select({ id: productVariants.id })
          .from(productVariants)
          .where(
            and(
              eq(productVariants.productId, products.id),
              or(
                ilike(productVariants.sku, term),
                ilike(productVariants.material, term),
                ilike(productVariants.color, term),
              ),
            ),
          ),
      ),
    );
    if (searchCondition) conditions.push(searchCondition);
  }

  const matched = await db
    .select()
    .from(products)
    .where(and(...conditions))
    .orderBy(desc(products.createdAt));

  if (matched.length === 0) return [];

  const productIds = matched.map((product) => product.id);

  const [variants, images] = await Promise.all([
    db.select().from(productVariants).where(inArray(productVariants.productId, productIds)),
    db
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(asc(productImages.position)),
  ]);

  const variantsByProduct = new Map<string, typeof variants>();
  for (const variant of variants) {
    const list = variantsByProduct.get(variant.productId) ?? [];
    list.push(variant);
    variantsByProduct.set(variant.productId, list);
  }

  const imagesByProduct = new Map<string, typeof images>();
  for (const image of images) {
    const list = imagesByProduct.get(image.productId) ?? [];
    list.push(image);
    imagesByProduct.set(image.productId, list);
  }

  return matched.map((product) => ({
    ...product,
    variants: variantsByProduct.get(product.id) ?? [],
    images: imagesByProduct.get(product.id) ?? [],
  }));
}

export type AdminProductListItem = Awaited<ReturnType<typeof listProductsForAdmin>>[number];

export async function createProduct(input: z.infer<typeof createProductSchema>) {
  const session = await requireStaff();
  const data = createProductSchema.parse(input);

  const [created] = await db
    .insert(products)
    .values({
      storeId: session.user.storeId,
      slug: data.slug,
      name: data.name,
      description: data.description,
      categoryId: data.categoryId,
      basePrice: data.basePrice.toFixed(2),
      specs: data.specs,
      technicalSpecs: data.technicalSpecs,
    })
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "create",
    entityType: "product",
    entityId: created.id,
    after: created,
  });

  revalidatePath("/");
  revalidatePath("/admin/productos");
  return created;
}

export async function updateProduct(id: string, input: z.infer<typeof updateProductSchema>) {
  const session = await requireStaff();
  const data = updateProductSchema.parse(input);

  const existing = await getOwnedProduct(id, session.user.storeId);
  if (!existing) throw new Error("Producto no encontrado.");

  const [updated] = await db
    .update(products)
    .set({
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      ...(data.basePrice !== undefined && { basePrice: data.basePrice.toFixed(2) }),
      ...(data.specs !== undefined && { specs: data.specs }),
      ...(data.technicalSpecs !== undefined && { technicalSpecs: data.technicalSpecs }),
    })
    .where(eq(products.id, id))
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "update",
    entityType: "product",
    entityId: id,
    before: existing,
    after: updated,
  });

  revalidatePath("/");
  revalidatePath(`/producto/${existing.slug}`);
  revalidatePath("/admin/productos");
  return updated;
}

export async function archiveProduct(id: string) {
  const session = await requireStaff();

  const existing = await getOwnedProduct(id, session.user.storeId);
  if (!existing) throw new Error("Producto no encontrado.");

  const [updated] = await db
    .update(products)
    .set({ active: false })
    .where(eq(products.id, id))
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "archive",
    entityType: "product",
    entityId: id,
    before: existing,
    after: updated,
  });

  revalidatePath("/");
  revalidatePath(`/producto/${existing.slug}`);
  revalidatePath("/admin/productos");
  return updated;
}

// --- Variantes ----------------------------------------------------------

// Codigo corto para identificar una variante en pedidos repetidos ("quiero
// el mismo que compre la vez pasada") sin que el admin tenga que inventar
// uno a mano: 3 letras del slug del producto + 6 caracteres del id de la
// variante (ya es aleatorio por ser uuid, asi que alcanza para que no
// choque). Solo se usa cuando no se cargo un sku manual — el campo sigue
// siendo editable despues desde el admin si prefieren su propia numeracion.
function generateVariantSku(productSlug: string, variantId: string): string {
  const prefix =
    productSlug
      .replace(/[^a-z0-9]/gi, "")
      .slice(0, 3)
      .toUpperCase() || "VAR";
  const suffix = variantId.replace(/-/g, "").slice(0, 6).toUpperCase();
  return `${prefix}-${suffix}`;
}

export async function createVariant(input: z.infer<typeof createVariantSchema>) {
  const session = await requireStaff();
  const data = createVariantSchema.parse(input);

  const product = await getOwnedProduct(data.productId, session.user.storeId);
  if (!product) throw new Error("Producto no encontrado.");

  const [created] = await db
    .insert(productVariants)
    .values({
      productId: data.productId,
      material: data.material,
      color: data.color,
      size: data.size,
      price: data.price.toFixed(2),
      compareAtPrice: data.compareAtPrice ? data.compareAtPrice.toFixed(2) : null,
      stock: data.stock,
      sku: data.sku,
    })
    .returning();

  // Sin sku manual: generamos uno ahora que ya tenemos el id real de la
  // variante (ver generateVariantSku arriba).
  let finalVariant = created;
  if (!data.sku) {
    const [withSku] = await db
      .update(productVariants)
      .set({ sku: generateVariantSku(product.slug, created.id) })
      .where(eq(productVariants.id, created.id))
      .returning();
    finalVariant = withSku;
  }

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "create",
    entityType: "product_variant",
    entityId: finalVariant.id,
    after: finalVariant,
  });

  revalidatePath(`/producto/${product.slug}`);
  revalidatePath("/admin/productos");
  return finalVariant;
}

export async function updateVariant(id: string, input: z.infer<typeof updateVariantSchema>) {
  const session = await requireStaff();
  const data = updateVariantSchema.parse(input);

  const [existing] = await db.select().from(productVariants).where(eq(productVariants.id, id)).limit(1);
  if (!existing) throw new Error("Variante no encontrada.");

  const product = await getOwnedProduct(existing.productId, session.user.storeId);
  if (!product) throw new Error("Variante no encontrada.");

  const [updated] = await db
    .update(productVariants)
    .set({
      ...(data.material !== undefined && { material: data.material }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.size !== undefined && { size: data.size }),
      ...(data.price !== undefined && { price: data.price.toFixed(2) }),
      // Sin guard de "!== undefined" a proposito (a diferencia de los demas
      // campos de arriba): el unico caller de updateVariant es
      // producto-form-dialog.tsx, que siempre reenvia la fila completa de
      // la variante -- si el admin borra el campo "Precio antes", el
      // payload manda compareAtPrice: undefined explicito, y eso tiene que
      // limpiar la oferta (NULL), no dejar el valor viejo pegado.
      compareAtPrice: data.compareAtPrice ? data.compareAtPrice.toFixed(2) : null,
      ...(data.stock !== undefined && { stock: data.stock }),
      ...(data.sku !== undefined && { sku: data.sku }),
    })
    .where(eq(productVariants.id, id))
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "update",
    entityType: "product_variant",
    entityId: id,
    before: existing,
    after: updated,
  });

  revalidatePath(`/producto/${product.slug}`);
  revalidatePath("/admin/productos");
  return updated;
}

export async function archiveVariant(id: string) {
  const session = await requireStaff();

  const [existing] = await db.select().from(productVariants).where(eq(productVariants.id, id)).limit(1);
  if (!existing) throw new Error("Variante no encontrada.");

  const product = await getOwnedProduct(existing.productId, session.user.storeId);
  if (!product) throw new Error("Variante no encontrada.");

  const [updated] = await db
    .update(productVariants)
    .set({ active: false })
    .where(eq(productVariants.id, id))
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "archive",
    entityType: "product_variant",
    entityId: id,
    before: existing,
    after: updated,
  });

  revalidatePath(`/producto/${product.slug}`);
  revalidatePath("/admin/productos");
  return updated;
}

// --- Categorias -----------------------------------------------------------

async function getOwnedCategory(id: string, storeId: string) {
  const [category] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.storeId, storeId)))
    .limit(1);
  return category;
}

// Sube por la cadena de parentId desde candidateParentId: si en algun punto
// llega a categoryId, es que candidateParentId es descendiente de categoryId,
// y asignarlo como padre cerraria un ciclo (listCategoryTree quedaria en
// recursion infinita armando el arbol).
async function wouldCreateCycle(
  categoryId: string,
  candidateParentId: string,
  storeId: string,
): Promise<boolean> {
  let currentId: string | null = candidateParentId;

  while (currentId) {
    if (currentId === categoryId) return true;

    const [current] = await db
      .select({ parentId: categories.parentId })
      .from(categories)
      .where(and(eq(categories.id, currentId), eq(categories.storeId, storeId)))
      .limit(1);

    currentId = current?.parentId ?? null;
  }

  return false;
}

export async function createCategory(input: z.infer<typeof createCategorySchema>) {
  const session = await requireStaff();
  const data = createCategorySchema.parse(input);

  if (data.parentId) {
    const parent = await getOwnedCategory(data.parentId, session.user.storeId);
    if (!parent) throw new Error("Categoria padre no encontrada.");
  }

  const [created] = await db
    .insert(categories)
    .values({
      storeId: session.user.storeId,
      name: data.name,
      slug: data.slug,
      parentId: data.parentId,
    })
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "create",
    entityType: "category",
    entityId: created.id,
    after: created,
  });

  revalidatePath("/");
  revalidatePath("/admin/categorias");
  return created;
}

export async function updateCategory(id: string, input: z.infer<typeof updateCategorySchema>) {
  const session = await requireStaff();
  const data = updateCategorySchema.parse(input);

  const existing = await getOwnedCategory(id, session.user.storeId);
  if (!existing) throw new Error("Categoria no encontrada.");

  if (data.parentId) {
    if (data.parentId === id) throw new Error("Una categoria no puede ser su propia padre.");
    const parent = await getOwnedCategory(data.parentId, session.user.storeId);
    if (!parent) throw new Error("Categoria padre no encontrada.");
    if (await wouldCreateCycle(id, data.parentId, session.user.storeId)) {
      throw new Error("No se puede asignar como padre a una subcategoria de si misma: crearia un ciclo.");
    }
  }

  const [updated] = await db
    .update(categories)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.parentId !== undefined && { parentId: data.parentId }),
    })
    .where(eq(categories.id, id))
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "update",
    entityType: "category",
    entityId: id,
    before: existing,
    after: updated,
  });

  revalidatePath("/");
  revalidatePath("/admin/categorias");
  return updated;
}

export async function reorderCategories(input: z.infer<typeof reorderCategoriesSchema>) {
  const session = await requireStaff();
  const items = reorderCategoriesSchema.parse(input);

  const ids = items.map((item) => item.id);
  const owned = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(inArray(categories.id, ids), eq(categories.storeId, session.user.storeId)));
  if (owned.length !== ids.length) {
    throw new Error("Alguna categoria no pertenece a la tienda.");
  }

  for (const item of items) {
    await db.update(categories).set({ position: item.position }).where(eq(categories.id, item.id));
  }

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "reorder",
    entityType: "category",
    after: items,
  });

  revalidatePath("/");
  revalidatePath("/admin/categorias");
  return items;
}

// --- Imagenes de producto ---------------------------------------------

export async function uploadProductImage(productId: string, file: File, position?: number) {
  const session = await requireStaff();
  uploadProductImageSchema.parse({ productId });

  const product = await getOwnedProduct(productId, session.user.storeId);
  if (!product) throw new Error("Producto no encontrado.");

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const isVideo = UPLOAD_VIDEO_ALLOWED_EXTENSIONS.includes(ext);
  if (!isVideo && !UPLOAD_IMAGE_ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(
      `Extension no permitida. Usa: ${[...UPLOAD_IMAGE_ALLOWED_EXTENSIONS, ...UPLOAD_VIDEO_ALLOWED_EXTENSIONS].join(", ")}.`,
    );
  }

  // Los videos pesan mucho mas que una foto — limite propio y mas alto
  // (env aparte, no reusa UPLOADS_MAX_SIZE_MB) para no tener que subir el
  // limite de imagenes solo por permitir video.
  const maxSizeMb = Number(process.env[isVideo ? "UPLOADS_MAX_VIDEO_SIZE_MB" : "UPLOADS_MAX_SIZE_MB"] ?? (isVideo ? 100 : 20));
  if (file.size > maxSizeMb * 1024 * 1024) {
    throw new Error(`El archivo supera el tamano maximo permitido (${maxSizeMb} MB).`);
  }

  const uploadsDir = process.env.UPLOADS_DIR ?? "./public/uploads";
  const productsDir = path.resolve(uploadsDir, "products");
  await mkdir(productsDir, { recursive: true });

  // Nombre generado server-side (nunca el original del cliente) para evitar
  // path traversal y colisiones entre imagenes de distintos productos.
  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(productsDir, filename), buffer);

  const existingImages = await db
    .select({ id: productImages.id })
    .from(productImages)
    .where(eq(productImages.productId, productId));

  const [created] = await db
    .insert(productImages)
    .values({
      productId,
      url: `/uploads/products/${filename}`,
      position: position ?? existingImages.length,
      mediaType: isVideo ? "video" : "image",
    })
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: isVideo ? "upload_video" : "upload_image",
    entityType: "product_image",
    entityId: created.id,
    after: created,
  });

  revalidatePath(`/producto/${product.slug}`);
  revalidatePath("/admin/productos");
  return created;
}

async function getOwnedProductImage(imageId: string, storeId: string) {
  const [row] = await db
    .select({ image: productImages, product: products })
    .from(productImages)
    .innerJoin(products, eq(products.id, productImages.productId))
    .where(and(eq(productImages.id, imageId), eq(products.storeId, storeId)))
    .limit(1);
  return row;
}

export async function deleteProductImage(id: string) {
  const session = await requireStaff();
  deleteProductImageSchema.parse({ id });

  const owned = await getOwnedProductImage(id, session.user.storeId);
  if (!owned) throw new Error("Imagen no encontrada.");

  await db.delete(productImages).where(eq(productImages.id, id));

  // Best-effort: si el archivo ya no esta en disco (o el path cambio a
  // mano), no bloqueamos el borrado del registro por eso.
  const uploadsDir = process.env.UPLOADS_DIR ?? "./public/uploads";
  const filename = owned.image.url.split("/").pop();
  if (filename) {
    try {
      await unlink(path.resolve(uploadsDir, "products", filename));
    } catch {
      // Ignorado a proposito.
    }
  }

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "delete_image",
    entityType: "product_image",
    entityId: id,
    before: owned.image,
  });

  revalidatePath(`/producto/${owned.product.slug}`);
  revalidatePath("/admin/productos");
  return { id };
}

export async function reorderProductImages(input: z.infer<typeof reorderProductImagesSchema>) {
  const session = await requireStaff();
  const items = reorderProductImagesSchema.parse(input);

  const ids = items.map((item) => item.id);
  const owned = await db
    .select({ id: productImages.id })
    .from(productImages)
    .innerJoin(products, eq(products.id, productImages.productId))
    .where(and(inArray(productImages.id, ids), eq(products.storeId, session.user.storeId)));
  if (owned.length !== ids.length) {
    throw new Error("Alguna imagen no pertenece a la tienda.");
  }

  for (const item of items) {
    await db.update(productImages).set({ position: item.position }).where(eq(productImages.id, item.id));
  }

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "reorder",
    entityType: "product_image",
    after: items,
  });

  revalidatePath("/admin/productos");
  return items;
}

// Publico, sin guard de rol: el tracking de "vistos antes" (ver
// recently-viewed-tracker.tsx) vive en localStorage del browser, esta
// action solo resuelve esos ids a datos de catalogo. Se acota a 12 ids para
// no permitir una query arbitrariamente grande desde el cliente.
export async function getRecentlyViewedProducts(ids: string[]) {
  const safeIds = ids.filter((id) => typeof id === "string" && id.length > 0).slice(0, 12);
  return listProductsByIds(safeIds);
}

// Buscador del header (task #12): resultados en vivo mientras se tipea.
// Publico, sin guard de rol (mismo criterio que el catalogo). Se acota a 6
// resultados -- es un preview para saltar directo al producto, no un
// listado completo (para eso ya esta "/" con ?search=).
const SEARCH_PREVIEW_LIMIT = 6;

export async function searchProductsPreview(query: string) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const results = await listProducts({ search: trimmed, sort: "relevancia" });
  return results.slice(0, SEARCH_PREVIEW_LIMIT);
}
