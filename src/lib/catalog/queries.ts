import { cache } from "react";
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

  const matched = await db
    .select()
    .from(products)
    .where(and(...conditions))
    .orderBy(orderBy);

  if (matched.length === 0) return [];

  // Se enriquece con lo que necesita la tarjeta de la grilla (imagen,
  // "desde $X", cantidad de variantes con stock): dos queries batched por
  // product id en vez de una por producto, para no hacer N+1.
  const productIds = matched.map((product) => product.id);

  const [images, variants] = await Promise.all([
    db
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(asc(productImages.position)),
    db
      .select()
      .from(productVariants)
      .where(and(inArray(productVariants.productId, productIds), eq(productVariants.active, true))),
  ]);

  const thumbnailByProduct = new Map<string, string>();
  for (const image of images) {
    if (!thumbnailByProduct.has(image.productId)) {
      thumbnailByProduct.set(image.productId, image.url);
    }
  }

  const variantsByProduct = new Map<string, typeof variants>();
  for (const variant of variants) {
    const list = variantsByProduct.get(variant.productId) ?? [];
    list.push(variant);
    variantsByProduct.set(variant.productId, list);
  }

  return matched.map((product) => {
    const productVariantsList = variantsByProduct.get(product.id) ?? [];
    const prices = productVariantsList.map((variant) => Number(variant.price));

    return {
      ...product,
      thumbnailUrl: thumbnailByProduct.get(product.id) ?? null,
      minVariantPrice: prices.length > 0 ? Math.min(...prices) : null,
      availableVariantCount: productVariantsList.filter((variant) => variant.stock > 0).length,
    };
  });
}

// Para el carrete de "productos que miraste antes": el tracking de que
// productos vio el usuario vive en localStorage del browser (ver
// recently-viewed-tracker.tsx), esta query solo resuelve esos ids a datos
// reales de catalogo — si un producto se desactivo o se borro, simplemente
// no aparece (no rompe nada del lado del cliente).
export async function listProductsByIds(ids: string[]) {
  if (ids.length === 0) return [];

  const storeId = await getDefaultStoreId();

  const matched = await db
    .select()
    .from(products)
    .where(and(inArray(products.id, ids), eq(products.storeId, storeId), eq(products.active, true)));

  if (matched.length === 0) return [];

  const productIds = matched.map((product) => product.id);

  const [images, variants] = await Promise.all([
    db
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(asc(productImages.position)),
    db
      .select()
      .from(productVariants)
      .where(and(inArray(productVariants.productId, productIds), eq(productVariants.active, true))),
  ]);

  const thumbnailByProduct = new Map<string, string>();
  for (const image of images) {
    if (!thumbnailByProduct.has(image.productId)) {
      thumbnailByProduct.set(image.productId, image.url);
    }
  }

  const variantsByProduct = new Map<string, typeof variants>();
  for (const variant of variants) {
    const list = variantsByProduct.get(variant.productId) ?? [];
    list.push(variant);
    variantsByProduct.set(variant.productId, list);
  }

  const byId = new Map(
    matched.map((product) => {
      const productVariantsList = variantsByProduct.get(product.id) ?? [];
      const prices = productVariantsList.map((variant) => Number(variant.price));
      return [
        product.id,
        {
          ...product,
          thumbnailUrl: thumbnailByProduct.get(product.id) ?? null,
          minVariantPrice: prices.length > 0 ? Math.min(...prices) : null,
          availableVariantCount: productVariantsList.filter((variant) => variant.stock > 0).length,
        },
      ];
    }),
  );

  // Se preserva el orden pedido (mas reciente visto primero), no el orden
  // de la query.
  return ids.map((id) => byId.get(id)).filter((product): product is NonNullable<typeof product> => Boolean(product));
}

export type ProductListItem = Awaited<ReturnType<typeof listProducts>>[number];

export type AvailableFilters = { materials: string[]; colors: string[] };

// Poblar los checkboxes de material/color con los valores que existen de
// verdad en variantes activas de productos activos, en vez de una lista
// hardcodeada que se desactualiza.
export async function listAvailableFilters(): Promise<AvailableFilters> {
  const storeId = await getDefaultStoreId();

  const rows = await db
    .selectDistinct({ material: productVariants.material, color: productVariants.color })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(and(eq(products.storeId, storeId), eq(products.active, true), eq(productVariants.active, true)));

  const materials = new Set<string>();
  const colors = new Set<string>();
  for (const row of rows) {
    materials.add(row.material);
    if (row.color) colors.add(row.color);
  }

  return {
    materials: [...materials].sort(),
    colors: [...colors].sort(),
  };
}

// cache() dedupea la query dentro del mismo request: generateMetadata y el
// propio Server Component de la pagina de producto la llaman las dos.
export const getProductBySlug = cache(async (slug: string) => {
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
});

export type CategoryTreeNode = typeof categories.$inferSelect & { children: CategoryTreeNode[] };

// cache() dedupea la query dentro del mismo request: el layout del sitio
// (footer) y la propia pagina de home (filtros/categorias destacadas) la
// llaman las dos, y sin esto pegarian dos veces a la DB por request.
export const listCategoryTree = cache(async (): Promise<CategoryTreeNode[]> => {
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
});

// Camino desde la raiz hasta la categoria buscada (para el breadcrumb
// "Inicio > Categoria > Subcategoria"). null si no aparece en el arbol.
export function findCategoryPath(
  tree: CategoryTreeNode[],
  categoryId: string,
): CategoryTreeNode[] | null {
  for (const node of tree) {
    if (node.id === categoryId) return [node];

    const childPath = findCategoryPath(node.children, categoryId);
    if (childPath) return [node, ...childPath];
  }

  return null;
}
