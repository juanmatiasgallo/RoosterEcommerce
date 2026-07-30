import type { Metadata } from "next";
import Link from "next/link";
import { listAvailableFilters, listCategoryTree, listProducts, type ProductSort } from "@/lib/catalog/queries";
import { CatalogClient } from "../catalog-client";
import { ProductCard } from "../product-card";
import { getMyFavoriteProductIds } from "@/lib/favorites/actions";
import { auth } from "@/auth";
import { AnimatedHeading } from "@/components/animated-heading";
import { AnimatedParagraph } from "@/components/animated-paragraph";

// Misma razon que la home: consulta la DB en cada request, no se puede
// pre-renderizar en build time (el build de Docker en EasyPanel no tiene red
// hacia la base).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ofertas | Tienda 3D",
  description: "Productos con descuento en Tienda 3D — impresion 3D a medida y catalogo fijo.",
};

const SORT_VALUES: ProductSort[] = ["relevancia", "precio_asc", "precio_desc", "nombre"];

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseListParam(value: string | string[] | undefined): string[] | undefined {
  const raw = firstValue(value);
  if (!raw) return undefined;
  const list = raw.split(",").filter(Boolean);
  return list.length > 0 ? list : undefined;
}

function parseNumberParam(value: string | string[] | undefined): number | undefined {
  const raw = firstValue(value);
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Pagina publica de ofertas (backlog "sistema de ofertas/descuentos"):
 * mismo catalogo/filtros que la home, pero fijo a onSale=true -- publica
 * para cualquier visitante, sin login, tal como se definio al planificar
 * esta feature (a diferencia del placeholder anterior en el header que
 * solo se mostraba a clientes logueados).
 */
export default async function OfertasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const sortValue = firstValue(sp.sort);
  const sort = SORT_VALUES.find((value) => value === sortValue);

  const listParams = {
    search: firstValue(sp.q),
    categoryId: firstValue(sp.categoryId),
    material: parseListParam(sp.material),
    color: parseListParam(sp.color),
    minPrice: parseNumberParam(sp.minPrice),
    maxPrice: parseNumberParam(sp.maxPrice),
    sort,
    onSale: true as const,
  };

  const [catalog, categoryTree, availableFilters, favoritedIds, session] = await Promise.all([
    listProducts(listParams),
    listCategoryTree(),
    listAvailableFilters(),
    getMyFavoriteProductIds(),
    auth(),
  ]);
  const isLoggedIn = Boolean(session);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="border-b border-neutral-200 pb-6 dark:border-neutral-800">
        <AnimatedHeading text="Ofertas" className="text-3xl font-semibold" />
        <AnimatedParagraph
          text="Productos con precio rebajado. Se actualiza automaticamente cuando cargamos o sacamos una oferta."
          className="mt-2 max-w-xl text-neutral-500"
        />
      </div>

      <div className="mt-6">
        <CatalogClient categoryTree={categoryTree} availableFilters={availableFilters}>
          {catalog.length === 0 ? (
            <p className="text-neutral-500">
              No hay ofertas activas por ahora.{" "}
              <Link href="/" className="underline">
                Ver todo el catalogo
              </Link>
              .
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {catalog.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  favorited={favoritedIds.includes(product.id)}
                  isLoggedIn={isLoggedIn}
                />
              ))}
            </div>
          )}
        </CatalogClient>
      </div>
    </main>
  );
}
