"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { archiveProduct, type AdminProductListItem } from "@/lib/catalog/actions";
import type { CategoryTreeNode } from "@/lib/catalog/queries";
import { Badge } from "@/components/ui/badge";
import { ProductoFormDialog } from "./producto-form-dialog";

type DialogState = { mode: "create" } | { mode: "edit"; product: AdminProductListItem } | null;

export function ProductosClient({
  products,
  categoryTree,
  initialSearch,
}: {
  products: AdminProductListItem[];
  categoryTree: CategoryTreeNode[];
  initialSearch: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  // Debounce ~300ms, mismo patron que el buscador del catalogo publico.
  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (searchInput === current) return;

    const timeout = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      if (searchInput) next.set("q", searchInput);
      else next.delete("q");

      const query = next.toString();
      startTransition(() => {
        router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    }, 300);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  async function handleArchive(product: AdminProductListItem) {
    if (!window.confirm(`Archivar "${product.name}"? Deja de verse en el catalogo publico.`)) return;

    setArchivingId(product.id);
    try {
      await archiveProduct(product.id);
      toast.success("Producto archivado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo archivar el producto.");
    } finally {
      setArchivingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Productos</h1>
        <button
          type="button"
          onClick={() => setDialogState({ mode: "create" })}
          className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          Nuevo producto
        </button>
      </div>

      <input
        type="search"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="Buscar por nombre..."
        className="w-full max-w-sm rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
      />

      <div className={`overflow-x-auto transition-opacity duration-200 ${isPending ? "opacity-60" : "opacity-100"}`}>
        {products.length === 0 ? (
          <p className="text-sm text-neutral-500">No hay productos que coincidan.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-800">
                <th className="py-2 pr-4 font-medium">Nombre</th>
                <th className="py-2 pr-4 font-medium">Precio base</th>
                <th className="py-2 pr-4 font-medium">Variantes</th>
                <th className="py-2 pr-4 font-medium">Estado</th>
                <th className="py-2 pr-4 font-medium" />
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-neutral-100 dark:border-neutral-900">
                  <td className="py-2 pr-4">
                    <div className="font-medium">{product.name}</div>
                    <div className="text-xs text-neutral-500">{product.slug}</div>
                  </td>
                  <td className="py-2 pr-4">{formatCurrency(Number(product.basePrice))}</td>
                  <td className="py-2 pr-4">{product.variants.length}</td>
                  <td className="py-2 pr-4">
                    {product.active ? (
                      <Badge variant="success">Activo</Badge>
                    ) : (
                      <Badge variant="neutral">Archivado</Badge>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setDialogState({ mode: "edit", product })}
                        className="rounded border border-neutral-300 px-2 py-1 text-xs font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                      >
                        Editar
                      </button>
                      {product.active && (
                        <button
                          type="button"
                          onClick={() => handleArchive(product)}
                          disabled={archivingId === product.id}
                          className="rounded border border-neutral-300 px-2 py-1 text-xs font-medium hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                        >
                          {archivingId === product.id ? "Archivando..." : "Archivar"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {dialogState?.mode === "create" && (
        <ProductoFormDialog mode="create" categoryTree={categoryTree} onClose={() => setDialogState(null)} />
      )}
      {dialogState?.mode === "edit" && (
        <ProductoFormDialog
          key={dialogState.product.id}
          mode="edit"
          product={dialogState.product}
          categoryTree={categoryTree}
          onClose={() => setDialogState(null)}
        />
      )}
    </div>
  );
}
