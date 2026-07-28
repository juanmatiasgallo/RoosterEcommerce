"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AvailableFilters, CategoryTreeNode, ProductSort } from "@/lib/catalog/queries";

type ApplyParams = (mutate: (params: URLSearchParams) => void) => void;

const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "relevancia", label: "Relevancia" },
  { value: "precio_asc", label: "Precio: menor a mayor" },
  { value: "precio_desc", label: "Precio: mayor a menor" },
  { value: "nombre", label: "Nombre" },
];

// Buscador y rango de precio comparten el mismo patron de debounce: el input
// tiene su propio estado local y recien despues de ~300ms de inactividad se
// empuja el valor a la URL (y dispara la query real via el Server Component).
function useDebouncedField(key: string, searchParams: URLSearchParams, applyParams: ApplyParams, delay = 300) {
  const [value, setValue] = useState(searchParams.get(key) ?? "");

  useEffect(() => {
    const current = searchParams.get(key) ?? "";
    if (value === current) return;

    const timeout = setTimeout(() => {
      applyParams((params) => {
        if (value) params.set(key, value);
        else params.delete(key);
      });
    }, delay);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, key]);

  return [value, setValue] as const;
}

export function CatalogClient({
  categoryTree,
  availableFilters,
  children,
}: {
  categoryTree: CategoryTreeNode[];
  availableFilters: AvailableFilters;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const applyParams = useCallback<ApplyParams>(
    (mutate) => {
      const next = new URLSearchParams(searchParams.toString());
      mutate(next);
      const query = next.toString();
      startTransition(() => {
        router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const [searchInput, setSearchInput] = useDebouncedField("q", searchParams, applyParams);
  const [minPriceInput, setMinPriceInput] = useDebouncedField("minPrice", searchParams, applyParams);
  const [maxPriceInput, setMaxPriceInput] = useDebouncedField("maxPrice", searchParams, applyParams);

  const selectedCategoryId = searchParams.get("categoryId");
  const selectedMaterials = searchParams.get("material")?.split(",").filter(Boolean) ?? [];
  const selectedColors = searchParams.get("color")?.split(",").filter(Boolean) ?? [];
  const sort = (searchParams.get("sort") as ProductSort | null) ?? "relevancia";

  function toggleListValue(key: "material" | "color", value: string, current: string[]) {
    applyParams((params) => {
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      if (next.length > 0) params.set(key, next.join(","));
      else params.delete(key);
    });
  }

  function setCategory(categoryId: string | null) {
    applyParams((params) => {
      if (categoryId) params.set("categoryId", categoryId);
      else params.delete("categoryId");
    });
  }

  function setSort(value: string) {
    applyParams((params) => {
      if (value && value !== "relevancia") params.set("sort", value);
      else params.delete("sort");
    });
  }

  function renderCategoryNode(node: CategoryTreeNode, depth: number) {
    const isSelected = selectedCategoryId === node.id;
    return (
      <li key={node.id}>
        <button
          type="button"
          onClick={() => setCategory(isSelected ? null : node.id)}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          className={`block w-full rounded px-2 py-1 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
            isSelected ? "font-semibold text-neutral-900 dark:text-neutral-50" : "text-neutral-600 dark:text-neutral-400"
          }`}
        >
          {node.name}
        </button>
        {node.children.length > 0 && <ul>{node.children.map((child) => renderCategoryNode(child, depth + 1))}</ul>}
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-8 md:flex-row">
      <aside className="flex w-full flex-col gap-6 md:w-64 md:shrink-0">
        <div>
          <label htmlFor="catalog-search" className="mb-1 block text-sm font-medium">
            Buscar
          </label>
          <input
            id="catalog-search"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Nombre del producto..."
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <div>
          <label htmlFor="catalog-sort" className="mb-1 block text-sm font-medium">
            Ordenar por
          </label>
          <select
            id="catalog-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {categoryTree.length > 0 && (
          <div>
            <h2 className="mb-1 text-sm font-medium">Categorias</h2>
            <ul className="flex flex-col gap-0.5">
              {selectedCategoryId && (
                <li>
                  <button
                    type="button"
                    onClick={() => setCategory(null)}
                    className="px-2 py-1 text-left text-xs text-neutral-500 hover:underline"
                  >
                    Limpiar categoria
                  </button>
                </li>
              )}
              {categoryTree.map((node) => renderCategoryNode(node, 0))}
            </ul>
          </div>
        )}

        {availableFilters.materials.length > 0 && (
          <div>
            <h2 className="mb-1 text-sm font-medium">Material</h2>
            <ul className="flex flex-col gap-1">
              {availableFilters.materials.map((material) => (
                <li key={material}>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedMaterials.includes(material)}
                      onChange={() => toggleListValue("material", material, selectedMaterials)}
                    />
                    {material}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        {availableFilters.colors.length > 0 && (
          <div>
            <h2 className="mb-1 text-sm font-medium">Color</h2>
            <ul className="flex flex-col gap-1">
              {availableFilters.colors.map((color) => (
                <li key={color}>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedColors.includes(color)}
                      onChange={() => toggleListValue("color", color, selectedColors)}
                    />
                    {color}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h2 className="mb-1 text-sm font-medium">Precio</h2>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={minPriceInput}
              onChange={(e) => setMinPriceInput(e.target.value)}
              placeholder="Min"
              className="w-1/2 rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
            <span className="text-neutral-400">-</span>
            <input
              type="number"
              min={0}
              value={maxPriceInput}
              onChange={(e) => setMaxPriceInput(e.target.value)}
              placeholder="Max"
              className="w-1/2 rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>
        </div>
      </aside>

      <div className={`flex-1 transition-opacity duration-200 ${isPending ? "opacity-60" : "opacity-100"}`}>
        {children}
      </div>
    </div>
  );
}
