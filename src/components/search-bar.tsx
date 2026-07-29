"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { searchProductsPreview } from "@/lib/catalog/actions";
import type { ProductListItem } from "@/lib/catalog/queries";
import { formatCurrency } from "@/lib/format";
import { StarRating } from "@/components/star-rating";
import { Spinner } from "@/components/ui/spinner";

const DEBOUNCE_MS = 300;

// Buscador del header (task #12): icono que expande un input, resultados en
// vivo mientras se tipea (debounced) sin recargar la pagina -- reusa
// listProducts({ search }) via el server action searchProductsPreview, asi
// que el matching (ilike sobre el nombre) es identico al que ya usa el
// buscador del catalogo en "/". "Ver todos" navega ahi con el mismo
// parametro ?q= para reusar esa misma pantalla completa de resultados.
export function SearchBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timeout = setTimeout(() => {
      searchProductsPreview(trimmed)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setIsLoading(false));
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [query]);

  function close() {
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  function goToFullResults() {
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/?q=${encodeURIComponent(trimmed)}#catalogo`);
    close();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buscar productos"
        className="flex items-center text-neutral-600 hover:text-accent dark:text-neutral-300"
      >
        <Search size={20} />
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        className="fixed inset-0 z-10 cursor-default"
        onClick={close}
      />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          goToFullResults();
        }}
        className="relative z-20 flex items-center gap-1.5"
      >
        <Search size={16} className="pointer-events-none absolute left-2.5 text-neutral-400" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") close();
          }}
          placeholder="Buscar productos..."
          className="w-44 rounded border border-neutral-300 bg-white py-1.5 pr-7 pl-8 text-sm sm:w-64 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="button"
          onClick={close}
          aria-label="Cerrar busqueda"
          className="absolute right-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
        >
          <X size={14} />
        </button>
      </form>

      {query.trim().length >= 2 && (
        <div className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 absolute top-full right-0 z-20 mt-2 flex max-h-96 w-80 flex-col overflow-y-auto rounded border border-neutral-200 bg-white shadow-lg duration-150 dark:border-neutral-800 dark:bg-neutral-900">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-4 text-sm text-neutral-500">
              <Spinner size={14} />
              Buscando...
            </div>
          ) : results.length === 0 ? (
            <p className="p-4 text-center text-sm text-neutral-500">No encontramos productos para &quot;{query}&quot;.</p>
          ) : (
            <>
              {results.map((product) => {
                const price = product.minVariantPrice ?? Number(product.basePrice);
                return (
                  <Link
                    key={product.id}
                    href={`/producto/${product.slug}`}
                    onClick={close}
                    className="flex items-center gap-3 border-b border-neutral-100 p-3 text-sm last:border-b-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50"
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-neutral-100 dark:bg-neutral-800">
                      {product.thumbnailUrl && (
                        <Image src={product.thumbnailUrl} alt={product.name} fill className="object-cover" sizes="48px" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <p className="truncate font-medium">{product.name}</p>
                      {product.reviewCount > 0 && (
                        <div className="flex items-center gap-1">
                          <StarRating value={product.averageRating} size={11} />
                          <span className="text-xs text-neutral-400">({product.reviewCount})</span>
                        </div>
                      )}
                      <p className="text-xs text-neutral-500">desde {formatCurrency(price)}</p>
                    </div>
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={goToFullResults}
                className="p-3 text-center text-xs font-medium text-accent hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
              >
                Ver todos los resultados para &quot;{query}&quot;
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
