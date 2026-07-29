import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findCategoryPath, getProductBySlug, listCategoryTree, listProducts } from "@/lib/catalog/queries";
import { Breadcrumb, type BreadcrumbItem } from "../../breadcrumb";
import { ProductCarousel } from "../../product-carousel";
import { ProductDetailsTabs } from "./product-details-tabs";
import { ProductGalleryClient } from "./product-gallery-client";
import { ProductReviews } from "./product-reviews";
import { RecentlyViewedCarousel } from "./recently-viewed-carousel";
import { VariantSelectorClient } from "./variant-selector-client";

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

// getProductBySlug esta cacheada (cache() de React) asi que llamarla aca y
// de nuevo en el componente de la pagina no duplica la query real.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
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

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const product = await getProductBySlug(slug);
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

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Breadcrumb items={breadcrumbItems} />

      <div className="grid gap-8 md:grid-cols-2">
        <ProductGalleryClient images={product.images} productName={product.name} />

        <div>
          <h1 className="text-2xl font-semibold">{product.name}</h1>

          <div className="mt-6">
            <VariantSelectorClient variants={product.variants} basePrice={product.basePrice} />
          </div>
        </div>
      </div>

      <ProductDetailsTabs description={product.description} specs={product.specs} />

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-lg font-semibold">Tambien te puede interesar</h2>
          <ProductCarousel products={related} />
        </section>
      )}

      <RecentlyViewedCarousel productId={product.id} />

      <ProductReviews productId={product.id} productSlug={product.slug} />
    </main>
  );
}
