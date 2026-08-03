"use client";

import type { getMyFavoriteProducts } from "@/lib/favorites/actions";
import { ProductCard } from "../../product-card";
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";

type FavoriteProduct = Awaited<ReturnType<typeof getMyFavoriteProducts>>[number];

// Separado de page.tsx (Server Component) solo para poder usar usePagination
// (task #146).
export function FavoritosClient({ products }: { products: FavoriteProduct[] }) {
  const { page, setPage, totalPages, pageItems } = usePagination(products);

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {pageItems.map((product) => (
          <ProductCard key={product.id} product={product} favorited isLoggedIn />
        ))}
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
