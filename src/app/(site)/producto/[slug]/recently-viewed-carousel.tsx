"use client";

import { useEffect, useState } from "react";
import type { ProductListItem } from "@/lib/catalog/queries";
import { getRecentlyViewedProducts } from "@/lib/catalog/actions";
import { ProductCarousel } from "../../product-carousel";

const STORAGE_KEY = "tienda3d:recently-viewed";
const MAX_TRACKED = 10;
const MAX_SHOWN = 8;

function readTrackedIds(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

// Trackea "vistos antes" en localStorage (sin cuenta ni schema nuevo) y
// muestra el carrete con los productos vistos antes de este, excluyendo el
// que se esta viendo ahora.
export function RecentlyViewedCarousel({ productId }: { productId: string }) {
  const [products, setProducts] = useState<ProductListItem[]>([]);

  useEffect(() => {
    const existing = readTrackedIds();
    const toShow = existing.filter((id) => id !== productId).slice(0, MAX_SHOWN);

    if (toShow.length > 0) {
      getRecentlyViewedProducts(toShow).then(setProducts).catch(() => setProducts([]));
    }

    const updated = [productId, ...existing.filter((id) => id !== productId)].slice(0, MAX_TRACKED);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // localStorage puede fallar (modo privado, cuota llena) — no es
      // critico, simplemente no se recuerda esta visita.
    }
  }, [productId]);

  if (products.length === 0) return null;

  return (
    <section className="mt-14">
      <h2 className="mb-4 text-lg font-semibold">Productos que miraste antes</h2>
      <ProductCarousel products={products} />
    </section>
  );
}
