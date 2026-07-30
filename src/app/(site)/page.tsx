import type { Metadata } from "next";
import Link from "next/link";
import {
  findCategoryPath,
  listAvailableFilters,
  listCategoryTree,
  listProducts,
  type ProductSort,
} from "@/lib/catalog/queries";
import { CatalogClient } from "./catalog-client";
import { DeliveryTimesSection } from "./delivery-times-section";
import { FeaturedCategories } from "./featured-categories";
import { Hero } from "./hero";
import { HowItWorks } from "./how-it-works";
import { MaterialSection } from "./material-section";
import { ProductCard } from "./product-card";
import { ServicesSection } from "./services-section";
import { ValueProps } from "./value-props";
import { NewsletterSection } from "./newsletter-section";
import { getMyFavoriteProductIds } from "@/lib/favorites/actions";
import { auth } from "@/auth";
import { AnimatedHeading } from "@/components/animated-heading";
import { HomeReplayBoundary } from "@/components/home-replay-boundary";
import { AmbientSiteBackground } from "@/components/ambient-site-background";

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

// listCategoryTree esta cacheada (cache() de React), asi que llamarla aca y
// de nuevo en el componente de la pagina no duplica la query real.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const categoryId = firstValue(sp.categoryId);
  if (!categoryId) return {};

  const categoryTree = await listCategoryTree();
  const path = findCategoryPath(categoryTree, categoryId);
  if (!path) return {};

  const categoryName = path[path.length - 1].name;

  return {
    title: `${categoryName} | Tienda 3D`,
    description: `Catalogo de ${categoryName.toLowerCase()} para impresion 3D — Tienda 3D.`,
  };
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

  const [catalog, categoryTree, availableFilters, favoritedIds, session] = await Promise.all([
    listProducts(listParams),
    listCategoryTree(),
    listAvailableFilters(),
    getMyFavoriteProductIds(),
    auth(),
  ]);
  const isLoggedIn = Boolean(session);

  const hasActiveFilters = Object.values(listParams).some((value) => value !== undefined);

  return (
    <HomeReplayBoundary>
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Hero />

      {/* Fondo ambiente SOLO para este tramo del medio (no toda la pagina,
          ver ambient-site-background.tsx): arranca despues del Hero -- que
          ya tiene su propio fondo mas fuerte, no hace falta superponer otro
          ahi -- y termina justo antes de Catalogo, que se pidio explicito
          que quede con el color de fondo natural, sin animacion. */}
      <div className="relative">
        <AmbientSiteBackground />
        <HowItWorks />
        <ValueProps />
        <ServicesSection />
        <DeliveryTimesSection />
        <MaterialSection />
        <FeaturedCategories categoryTree={categoryTree} />
      </div>

      <div id="catalogo" className="scroll-mt-6 border-t border-neutral-200 pt-10 dark:border-neutral-800">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <AnimatedHeading text="Catalogo" className="text-2xl font-semibold" />
          <span className="text-sm text-neutral-500">
            {catalog.length} articulo{catalog.length === 1 ? "" : "s"}
            {hasActiveFilters ? " con estos filtros" : " disponible" + (catalog.length === 1 ? "" : "s")}
          </span>
        </div>
        <p className="mt-1 text-neutral-500">Todos nuestros articulos disponibles para impresion 3D.</p>
      </div>

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

      <p className="mt-10 text-neutral-600 dark:text-neutral-400">
        ¿Necesitas algo que no esta en el catalogo?{" "}
        <Link href="/pedido-a-medida" className="underline">
          Pedila a medida
        </Link>
        .
      </p>

      <NewsletterSection />
    </main>
    </HomeReplayBoundary>
  );
}
