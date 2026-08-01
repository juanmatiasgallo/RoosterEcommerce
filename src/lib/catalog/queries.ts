import { cache } from "react";
import { and, asc, avg, count, desc, eq, exists, gt, gte, ilike, inArray, isNotNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, productImages, productReviews, products, productVariants } from "@/lib/db/schema";
import { getDefaultStoreId } from "@/lib/db/store";

// Promedio de estrellas + cantidad de reseñas por producto, para mostrar en
// las ProductCard de la grilla/carreteles (no solo en la ficha de
// producto). Una sola query agrupada por productId en vez de N+1 -- mismo
// criterio que el resto de este archivo con imagenes/variantes.
async function reviewSummaryByProduct(productIds: string[]): Promise<Map<string, { average: number; count: number }>> {
  if (productIds.length === 0) return new Map();

  const rows = await db
    .select({ productId: productReviews.productId, average: avg(productReviews.rating), total: count(productReviews.id) })
    .from(productReviews)
    .where(inArray(productReviews.productId, productIds))
    .groupBy(productReviews.productId);

  return new Map(rows.map((row) => [row.productId, { average: row.average ? Number(row.average) : 0, count: row.total }]));
}

// onSale/discountPercent para la ProductCard (badge "Oferta -X%") y la ficha
// de producto: se computan aca (no en el componente) para no repetir la
// logica de "cual es el mayor % de descuento entre las variantes" en cada
// lugar que consume ProductListItem.
function computeSaleInfo(variants: { price: string; compareAtPrice: string | null }[]): {
  onSale: boolean;
  discountPercent: number | null;
} {
  let bestPercent = 0;
  for (const variant of variants) {
    if (!variant.compareAtPrice) continue;
    const price = Number(variant.price);
    const compareAtPrice = Number(variant.compareAtPrice);
    if (compareAtPrice <= price) continue;
    const percent = Math.round((1 - price / compareAtPrice) * 100);
    if (percent > bestPercent) bestPercent = percent;
  }
  return bestPercent > 0 ? { onSale: true, discountPercent: bestPercent } : { onSale: false, discountPercent: null };
}

// La variante que define el "desde $X" de la ProductCard -- se reusa para
// saber si ESA variante puntual tiene precio tachado (no cualquier otra
// variante del producto, para que el tachado que se muestra al lado del
// precio sea coherente).
function pickMinPriceVariant<T extends { price: string }>(variants: T[]): T | null {
  if (variants.length === 0) return null;
  return variants.reduce((min, variant) => (Number(variant.price) < Number(min.price) ? variant : min));
}

export type ProductSort = "relevancia" | "precio_asc" | "precio_desc" | "nombre";

export type ListProductsParams = {
  search?: string;
  categoryId?: string;
  material?: string[];
  color?: string[];
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSort;
  // Backlog "sistema de ofertas/descuentos": solo productos con al menos una
  // variante activa en oferta (compareAtPrice > price). Usado por /ofertas.
  onSale?: boolean;
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

  // Antes solo matcheaba products.name -- buscar por SKU, material o color
  // (ej. "PLA", "azul", el codigo de una variante) no traia nada. Se amplia
  // a nombre + descripcion + EXISTS contra variantes activas (mismo patron
  // EXISTS que el filtro de material/color unas lineas mas abajo), sin
  // sumar infra nueva (planificacion Typesense: con el volumen actual esto
  // alcanza, se reevalua mas adelante con datos reales).
  if (params.search) {
    const term = `%${params.search}%`;
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
              eq(productVariants.active, true),
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
      // Case-insensitive: el catalogo tenia variantes cargadas como "Azul"
      // y "azul" por separado (typeo del admin al no reusar el mismo
      // valor) — listAvailableFilters ya las agrupa en una sola opcion de
      // checkbox, pero si el filtro comparara con inArray exacto, tildar
      // "Azul" seguiria sin traer los productos cargados como "azul".
      const lowerColors = params.color.map((color) => color.toLowerCase());
      variantConditions.push(inArray(sql`lower(${productVariants.color})`, lowerColors));
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

  // onSale: al menos una variante activa con precio tachado mayor al precio
  // real (mismo patron EXISTS que material/color arriba).
  if (params.onSale) {
    conditions.push(
      exists(
        db
          .select({ id: productVariants.id })
          .from(productVariants)
          .where(
            and(
              eq(productVariants.productId, products.id),
              eq(productVariants.active, true),
              isNotNull(productVariants.compareAtPrice),
              gt(productVariants.compareAtPrice, productVariants.price),
            ),
          ),
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

  const [images, variants, reviewSummaries] = await Promise.all([
    db
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(asc(productImages.position)),
    db
      .select()
      .from(productVariants)
      .where(and(inArray(productVariants.productId, productIds), eq(productVariants.active, true))),
    reviewSummaryByProduct(productIds),
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
    const reviewSummary = reviewSummaries.get(product.id);
    const saleInfo = computeSaleInfo(productVariantsList);
    const minPriceVariant = pickMinPriceVariant(productVariantsList);

    return {
      ...product,
      thumbnailUrl: thumbnailByProduct.get(product.id) ?? null,
      minVariantPrice: prices.length > 0 ? Math.min(...prices) : null,
      // Precio tachado para la ProductCard: solo el de la MISMA variante que
      // da el "desde $X" (no el de mayor descuento del producto), para que
      // el tachado siempre corresponda al precio mostrado al lado.
      minVariantCompareAtPrice:
        minPriceVariant?.compareAtPrice && Number(minPriceVariant.compareAtPrice) > Number(minPriceVariant.price)
          ? Number(minPriceVariant.compareAtPrice)
          : null,
      availableVariantCount: productVariantsList.filter((variant) => variant.stock > 0).length,
      averageRating: reviewSummary?.average ?? 0,
      reviewCount: reviewSummary?.count ?? 0,
      onSale: saleInfo.onSale,
      discountPercent: saleInfo.discountPercent,
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

  const [images, variants, reviewSummaries] = await Promise.all([
    db
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(asc(productImages.position)),
    db
      .select()
      .from(productVariants)
      .where(and(inArray(productVariants.productId, productIds), eq(productVariants.active, true))),
    reviewSummaryByProduct(productIds),
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
      const reviewSummary = reviewSummaries.get(product.id);
      const saleInfo = computeSaleInfo(productVariantsList);
      const minPriceVariant = pickMinPriceVariant(productVariantsList);
      return [
        product.id,
        {
          ...product,
          thumbnailUrl: thumbnailByProduct.get(product.id) ?? null,
          minVariantPrice: prices.length > 0 ? Math.min(...prices) : null,
          minVariantCompareAtPrice:
            minPriceVariant?.compareAtPrice && Number(minPriceVariant.compareAtPrice) > Number(minPriceVariant.price)
              ? Number(minPriceVariant.compareAtPrice)
              : null,
          availableVariantCount: productVariantsList.filter((variant) => variant.stock > 0).length,
          averageRating: reviewSummary?.average ?? 0,
          reviewCount: reviewSummary?.count ?? 0,
          onSale: saleInfo.onSale,
          discountPercent: saleInfo.discountPercent,
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
  // Case-insensitive: si el admin cargo "Azul" en una variante y "azul" en
  // otra, antes aparecian como 2 checkboxes separados en el filtro. Se
  // agrupan por su forma en minuscula y se muestra una unica etiqueta
  // canonica (Primera letra mayuscula) por grupo.
  const colorsByKey = new Map<string, string>();
  for (const row of rows) {
    materials.add(row.material);
    if (row.color) {
      const key = row.color.toLowerCase();
      if (!colorsByKey.has(key)) {
        colorsByKey.set(key, key.charAt(0).toUpperCase() + key.slice(1));
      }
    }
  }

  return {
    materials: [...materials].sort(),
    colors: [...colorsByKey.values()].sort(),
  };
}

// cache() dedupea la query dentro del mismo request: generateMetadata y el
// propio Server Component de la pagina de producto la llaman las dos.
// Reemplaza a la vieja getProductBySlug (task #88): la ficha publica ahora
// resuelve por codigo (/producto/[codigo]), no por slug -- el codigo es
// mas facil de decir/anotar/buscar que un slug de texto libre, y viene
// garantizado unico por la base (a diferencia del slug, que hoy es texto
// libre tipeado a mano por el admin).
export const getProductByCode = cache(async (code: string) => {
  const storeId = await getDefaultStoreId();

  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.code, code), eq(products.storeId, storeId), eq(products.active, true)))
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
