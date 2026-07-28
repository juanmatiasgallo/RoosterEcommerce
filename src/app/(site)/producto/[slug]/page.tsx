import { notFound } from "next/navigation";
import { findCategoryPath, getProductBySlug, listCategoryTree, listProducts } from "@/lib/catalog/queries";
import { Breadcrumb, type BreadcrumbItem } from "../../breadcrumb";
import { ProductCard } from "../../product-card";
import { ProductGalleryClient } from "./product-gallery-client";
import { VariantSelectorClient } from "./variant-selector-client";

// Igual que en "/": consulta la DB, asi que no puede quedar como estatica o
// el build de Docker en EasyPanel falla (no tiene red hacia la DB en build
// time).
export const dynamic = "force-dynamic";

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
    ? (await listProducts({ categoryId: product.categoryId })).filter((p) => p.id !== product.id).slice(0, 4)
    : [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Breadcrumb items={breadcrumbItems} />

      <div className="grid gap-8 md:grid-cols-2">
        <ProductGalleryClient images={product.images} productName={product.name} />

        <div>
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          {product.description && (
            <p className="mt-2 text-neutral-600 dark:text-neutral-400">{product.description}</p>
          )}

          <div className="mt-6">
            <VariantSelectorClient variants={product.variants} basePrice={product.basePrice} />
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-lg font-semibold">Tambien te puede interesar</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {related.map((relatedProduct) => (
              <ProductCard key={relatedProduct.id} product={relatedProduct} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
