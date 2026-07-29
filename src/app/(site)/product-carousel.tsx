"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductListItem } from "@/lib/catalog/queries";
import { ProductCard } from "./product-card";

// Carrete horizontal con scroll-snap: se usa tanto para "Tambien te puede
// interesar" (mismo rubro) como para "Productos que miraste antes"
// (recently-viewed-carousel.tsx) — misma UI, distinta fuente de datos.
export function ProductCarousel({
  products,
  favoritedIds = [],
  isLoggedIn = false,
}: {
  products: ProductListItem[];
  favoritedIds?: string[];
  isLoggedIn?: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollByAmount(direction: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product) => (
          <div key={product.id} className="w-40 shrink-0 snap-start sm:w-48">
            <ProductCard product={product} favorited={favoritedIds.includes(product.id)} isLoggedIn={isLoggedIn} />
          </div>
        ))}
      </div>

      {products.length > 3 && (
        <>
          <button
            type="button"
            onClick={() => scrollByAmount(-1)}
            aria-label="Ver anteriores"
            className="absolute left-0 top-1/3 hidden -translate-x-1/2 rounded-full border border-neutral-200 bg-white p-1.5 shadow sm:flex dark:border-neutral-800 dark:bg-neutral-900"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => scrollByAmount(1)}
            aria-label="Ver siguientes"
            className="absolute right-0 top-1/3 hidden translate-x-1/2 rounded-full border border-neutral-200 bg-white p-1.5 shadow sm:flex dark:border-neutral-800 dark:bg-neutral-900"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}
    </div>
  );
}
