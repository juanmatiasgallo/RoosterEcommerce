import { and, asc, desc, eq, exists, gte, ilike, inArray, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, productImages, products, productVariants } from "@/lib/db/schema";
import { getDefaultStoreId } from "@/lib/db/store";

export type ProductSort = "relevancia" | "precio_asc" | "precio_desc" | "nombre";

export type ListProductsParams = {
  search?: string;
  categoryId?: string;
  material?: string[];
  color?: string[];
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSort;
};

// El arbol de categorias soporta profundidad arbitraria, pero el filtro de
// catalogo solo pide la categoria elegida + sus hijas directas (no nietas).
async function categoryAndDirectChildrenIds(categoryId: string): Promise<string[]> {
  const children = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.parentId, categoryId));

  return [categoryId, ...children.map((c) => c.id)];
}

export async function listProducts(params: ListProductsParams = {}) {
  const storeId = await getDefaultStoreId();
  const conditions = [eq(products.storeId, storeId), eq(products.active, true)];

  if (params.search) {
    conditions.push(ilike(products.name, `%${params.search}%`));
  }

  if (params.categoryId) {
    const ids = await categoryAndDirectChildrenIds(params.categoryId);
    conditions.push(inArray(products.categoryId, ids));
  }

  if (params.minPrice !== undefined) {
    conditions.push(gte(products.basePrice, params.minPrice.toFixed(2)));
  }

  if (params.maxPrice !== undefined) {
    conditions.push(lte(products.basePrice, params.maxPrice.toFixed(2)));
  }

  // material/color: al menos una variante activa del producto que matchee.
  // EXISTS evita duplicar filas de producto (vs. un join + distinct).
  if (params.material?.length || params.color?.length) {
    const variantConditions = [
      eq(productVariants.productId, products.id),
      eq(productVariants.active, true),
    ];
    if (params.material?.length) {
      variantConditions.push(inArray(productVariants.material, params.material));
    }
    if (params.color?.length) {
      variantConditions.push(inArray(productVariants.color, params.color));
    }
    conditions.push(
      exists(
        db
          .select({ id: productVariants.id })
          .from(productVariants)
          .where(and(...variantConditions)),
      ),
    );
  }

  const orderBy = (() => {
    switch (params.sort) {
      case "precio_asc":
        return asc(products.basePrice);
      case "precio_desc":
        return desc(products.basePrice);
      case "nombre":
        return asc(products.name);
      case "relevancia":
      default:
        return desc(products.createdAt);
    }
  })();

  return db
    .select()
    .from(products)
    .where(and(...conditions))
    .orderBy(orderBy);
}

export async function getProductBySlug(slug: string) {
  const storeId = await getDefaultStoreId();

  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.slug, slug), eq(products.storeId, storeId), eq(products.active, true)))
    .limit(1);

  if (!product) return null;

  const [variants, images] = await Promise.all([
    db
      .select()
      .from(productVariants)
      .where(and(eq(productVariants.productId, product.id), eq(productVariants.active, true))),
    db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, product.id))
      .orderBy(asc(productImages.position)),
  ]);

  return { ...product, variants, images };
}

export type CategoryTreeNode = typeof categories.$inferSelect & { children: CategoryTreeNode[] };

export async function listCategoryTree(): Promise<CategoryTreeNode[]> {
  const storeId = await getDefaultStoreId();

  const all = await db
    .select()
    .from(categories)
    .where(eq(categories.storeId, storeId))
    .orderBy(asc(categories.position), asc(categories.name));

  const byId = new Map<string, CategoryTreeNode>();
  for (const category of all) {
    byId.set(category.id, { ...category, children: [] });
  }

  const roots: CategoryTreeNode[] = [];
  for (const category of byId.values()) {
    if (category.parentId) {
      byId.get(category.parentId)?.children.push(category);
    } else {
      roots.push(category);
    }
  }

  return roots;
}
