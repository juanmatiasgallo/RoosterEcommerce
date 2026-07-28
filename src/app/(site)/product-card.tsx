import Image from "next/image";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import type { ProductListItem } from "@/lib/catalog/queries";
import { Badge } from "@/components/ui/badge";
import { ProductPlaceholder } from "@/components/product-placeholder";

export function ProductCard({ product }: { product: ProductListItem }) {
  const price = product.minVariantPrice ?? Number(product.basePrice);

  return (
    <Link
      href={`/producto/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-neutral-200 transition hover:shadow-md dark:border-neutral-800"
    >
      <div className="relative aspect-square bg-neutral-100 dark:bg-neutral-900">
        {product.thumbnailUrl ? (
          <Image
            src={product.thumbnailUrl}
            alt={product.name}
            fill
            className="object-cover transition group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <ProductPlaceholder />
        )}

        {product.availableVariantCount > 0 ? (
          <Badge
            variant="neutral"
            className="absolute right-2 top-2 bg-white/90 shadow dark:bg-neutral-800/90 dark:text-neutral-200"
          >
            {product.availableVariantCount} variante{product.availableVariantCount === 1 ? "" : "s"}
          </Badge>
        ) : (
          <Badge variant="neutral" className="absolute right-2 top-2 bg-neutral-800/90 text-white dark:bg-neutral-800/90">
            Sin stock
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">{product.name}</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">desde {formatCurrency(price)}</p>
      </div>
    </Link>
  );
}
