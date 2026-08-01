import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findCategoryPath, getProductByCode, listCategoryTree, listProducts } from "@/lib/catalog/queries";
import { Breadcrumb, type BreadcrumbItem } from "../../breadcrumb";
import { ProductCarousel } from "../../product-carousel";
import { ProductDetailsTabs } from "./product-details-tabs";
import { ProductGalleryClient } from "./product-gallery-client";
import { ProductInquiry } from "./product-inquiry";
import { ProductReviews } from "./product-reviews";
import { RecentlyViewedCarousel } from "./recently-viewed-carousel";
import { VariantSelectorClient } from "./variant-selector-client";
import { getMyFavoriteProductIds } from "@/lib/favorites/actions";
import { FavoriteButton } from "@/components/favorite-button";
import { auth } from "@/auth";

// Igual que en "/": consulta la DB, asi que no puede quedar como estatica o
// el build de Docker en EasyPanel falla (no tiene red hacia la DB en build
// time).
export const dynamic = "force-dynamic";

const DESCRIPTION_MAX_LENGTH = 160;
const FALLBACK_DESCRIPTION = "Impresion 3D a pedido, catalogo y piezas a medida — Tienda 3D.";

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

// getProductByCode esta cacheada (cache() de React) asi que llamarla aca y
// de nuevo en el componente de la pagina no duplica la query real.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ codigo: string }>;
}): Promise<Metadata> {
  const { codigo } = await params;
  const product = await getProductByCode(codigo);
  if (!product) return {};

  const description = product.description
    ? truncate(product.description, DESCRIPTION_MAX_LENGTH)
    : FALLBACK_DESCRIPTION;
  const firstImage = product.images[0];

  return {
    title: `${product.name} | Tienda 3D`,
    description,
    openGraph: {
      title: product.name,
      description,
      images: firstImage ? [{ url: firstImage.url }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;

  const product = await getProductByCode(codigo);
  if (!product) notFound();

  const categoryTree = await listCategoryTree();
  const categoryPath = product.categoryId ? findCategoryPath(categoryTree, product.categoryId) : null;

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Inicio", href: "/" },
    ...(categoryPath?.map((node) => ({ label: node.name, href: `/?categoryId=${node.id}` })) ?? []),
    { label: product.name },
  ];

  const related = product.categoryId
    ? (await listProducts({ categoryId: product.categoryId })).filter((p) => p.id !== product.id).slice(0, 10)
    : [];

  const [favoritedIds, session] = await Promise.all([getMyFavoriteProductIds(), auth()]);
  const isFavorited = favoritedIds.includes(product.id);
  const isLoggedIn = Boolean(session);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Breadcrumb items={breadcrumbItems} />

      <div className="grid gap-8 md:grid-cols-2">
        <ProductGalleryClient images={product.images} productName={product.name} />

        <div>
          <h1 className="text-2xl font-semibold">{product.name}</h1>

          <div className="mt-6">
            <VariantSelectorClient
              variants={product.variants}
              basePrice={product.basePrice}
              productId={product.id}
              productName={product.name}
            />
          </div>

          <div className="mt-3">
            <FavoriteButton productId={product.id} initialFavorited={isFavorited} isLoggedIn={isLoggedIn} variant="button" />
          </div>
        </div>
      </div>

      <ProductDetailsTabs description={product.description} specs={product.specs} technicalSpecs={product.technicalSpecs} />

      <RecentlyViewedCarousel productId={product.id} isLoggedIn={isLoggedIn} />

      <ProductReviews productId={product.id} productCode={product.code} />

      <ProductInquiry
        productId={product.id}
        productCode={product.code}
        isLoggedIn={isLoggedIn}
        role={session?.user.role}
      />

      {/* Productos similares (task #7): a pedido del owner, va despues de
          los comentarios -- antes ("Tambien te puede interesar") quedaba
          arriba de todo, entre las solapas y las resenas. */}
      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-lg font-semibold">Productos similares</h2>
          <ProductCarousel products={related} favoritedIds={favoritedIds} isLoggedIn={isLoggedIn} />
        </section>
      )}
    </main>
  );
}
