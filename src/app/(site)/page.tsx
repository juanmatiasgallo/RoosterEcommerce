import Link from "next/link";
import { listAvailableFilters, listCategoryTree, listProducts, type ProductSort } from "@/lib/catalog/queries";
import { CatalogClient } from "./catalog-client";
import { ProductCard } from "./product-card";

// Esta pagina consulta la DB en cada request: si se deja como estatica por
// defecto, `next build` la pre-renderiza en build time y el build de Docker
// en EasyPanel falla porque el contenedor de build no tiene red hacia la DB
// (ya paso una vez, ver historial de deploys).
export const dynamic = "force-dynamic";

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
 * Pagina principal publica: catalogo con buscador, filtros de
 * categoria/material/color/precio y orden, todo manejado via searchParams
 * (el Client Component `CatalogClient` los escribe en la URL con debounce +
 * useTransition; esta pagina, Server Component, los lee y arma la query real
 * contra `listProducts`).
 */
export default async function HomePage({
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
  };

  const [catalog, categoryTree, availableFilters] = await Promise.all([
    listProducts(listParams),
    listCategoryTree(),
    listAvailableFilters(),
  ]);

  const hasActiveFilters = Object.values(listParams).some((value) => value !== undefined);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Catalogo</h1>
      <p className="mt-1 text-neutral-500">Todos nuestros articulos disponibles para impresion 3D.</p>

      <div className="mt-6">
        <CatalogClient categoryTree={categoryTree} availableFilters={availableFilters}>
          {catalog.length === 0 ? (
            <p className="text-neutral-500">
              No encontramos productos con esos filtros
              {hasActiveFilters && (
                <>
                  {" "}
                  <Link href="/" className="underline">
                    Limpiar filtros
                  </Link>
                </>
              )}
              .
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {catalog.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </CatalogClient>
      </div>

      <p className="mt-10 text-neutral-600 dark:text-neutral-400">
        ¿Necesitas algo que no esta en el catalogo?{" "}
        <Link href="/pedido-a-medida" className="underline">
          Pedila a medida
        </Link>
        .
      </p>
    </main>
  );
}
