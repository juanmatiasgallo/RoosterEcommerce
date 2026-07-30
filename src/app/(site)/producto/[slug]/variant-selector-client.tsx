"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { addToCart, getCartItems, type CartRow } from "@/lib/cart/actions";
import { Spinner } from "@/components/ui/spinner";
import { CartDrawer } from "@/components/cart-drawer";

type Variant = {
  id: string;
  material: string;
  color: string | null;
  size: string | null;
  price: string;
  compareAtPrice: string | null;
  stock: number;
  sku: string | null;
};

function uniqueValues(variants: Variant[], pick: (v: Variant) => string): string[] {
  return Array.from(new Set(variants.map(pick)));
}

export function VariantSelectorClient({ variants, basePrice }: { variants: Variant[]; basePrice: string }) {
  const materials = useMemo(() => uniqueValues(variants, (v) => v.material), [variants]);
  const [material, setMaterial] = useState(materials[0] ?? "");

  const colorsForMaterial = useMemo(
    () => uniqueValues(variants.filter((v) => v.material === material), (v) => v.color ?? ""),
    [variants, material],
  );
  const [color, setColor] = useState(colorsForMaterial[0] ?? "");

  const sizesForMaterialColor = useMemo(
    () =>
      uniqueValues(
        variants.filter((v) => v.material === material && (v.color ?? "") === color),
        (v) => v.size ?? "",
      ),
    [variants, material, color],
  );
  const [size, setSize] = useState(sizesForMaterialColor[0] ?? "");

  // Cascada material -> color -> tamano: cambiar un nivel superior resetea
  // los de abajo a la primera opcion valida para la nueva combinacion.
  function handleMaterialChange(nextMaterial: string) {
    setMaterial(nextMaterial);
    const nextColors = uniqueValues(
      variants.filter((v) => v.material === nextMaterial),
      (v) => v.color ?? "",
    );
    const nextColor = nextColors[0] ?? "";
    setColor(nextColor);
    const nextSizes = uniqueValues(
      variants.filter((v) => v.material === nextMaterial && (v.color ?? "") === nextColor),
      (v) => v.size ?? "",
    );
    setSize(nextSizes[0] ?? "");
  }

  function handleColorChange(nextColor: string) {
    setColor(nextColor);
    const nextSizes = uniqueValues(
      variants.filter((v) => v.material === material && (v.color ?? "") === nextColor),
      (v) => v.size ?? "",
    );
    setSize(nextSizes[0] ?? "");
  }

  const selectedVariant = variants.find(
    (v) => v.material === material && (v.color ?? "") === color && (v.size ?? "") === size,
  );

  const [quantity, setQuantity] = useState(1);
  const [isPending, startTransition] = useTransition();

  // Se abre el panel lateral (CartDrawer) apenas se agrega algo, con el
  // contenido actualizado del carrito — mas claro que solo un toast chico,
  // y le da al usuario la decision explicita de seguir comprando o pagar ya.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerItems, setDrawerItems] = useState<CartRow[]>([]);
  const [drawerTotal, setDrawerTotal] = useState(0);

  const hasAnyStock = variants.some((v) => v.stock > 0);
  const canAddToCart = Boolean(selectedVariant) && (selectedVariant?.stock ?? 0) > 0 && quantity > 0;

  function handleAddToCart() {
    if (!canAddToCart || !selectedVariant) return;

    startTransition(async () => {
      try {
        await addToCart(selectedVariant.id, quantity);
        const fresh = await getCartItems();
        setDrawerItems(fresh.items);
        setDrawerTotal(fresh.total);
        setDrawerOpen(true);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo agregar al carrito.");
      }
    });
  }

  const displayPrice = selectedVariant ? Number(selectedVariant.price) : Number(basePrice);
  const displayCompareAtPrice =
    selectedVariant?.compareAtPrice && Number(selectedVariant.compareAtPrice) > displayPrice
      ? Number(selectedVariant.compareAtPrice)
      : null;
  const discountPercent =
    displayCompareAtPrice !== null ? Math.round((1 - displayPrice / displayCompareAtPrice) * 100) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <p className="text-2xl font-semibold">{formatCurrency(displayPrice)}</p>
        {displayCompareAtPrice !== null && (
          <>
            <p className="text-base text-neutral-400 line-through dark:text-neutral-600">
              {formatCurrency(displayCompareAtPrice)}
            </p>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
              -{discountPercent}%
            </span>
          </>
        )}
      </div>

      <div>
        <h2 className="mb-1 text-sm font-medium">Material</h2>
        <div className="flex flex-wrap gap-2">
          {materials.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handleMaterialChange(m)}
              className={`rounded border px-3 py-1.5 text-sm ${
                m === material
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                  : "border-neutral-300 dark:border-neutral-700"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {colorsForMaterial.some(Boolean) && (
        <div>
          <h2 className="mb-1 text-sm font-medium">Color</h2>
          <div className="flex flex-wrap gap-2">
            {colorsForMaterial.map((c) => (
              <button
                key={c || "sin-color"}
                type="button"
                onClick={() => handleColorChange(c)}
                className={`rounded border px-3 py-1.5 text-sm ${
                  c === color
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                    : "border-neutral-300 dark:border-neutral-700"
                }`}
              >
                {c || "Sin color"}
              </button>
            ))}
          </div>
        </div>
      )}

      {sizesForMaterialColor.some(Boolean) && (
        <div>
          <h2 className="mb-1 text-sm font-medium">Tamano</h2>
          <div className="flex flex-wrap gap-2">
            {sizesForMaterialColor.map((s) => (
              <button
                key={s || "sin-tamano"}
                type="button"
                onClick={() => setSize(s)}
                className={`rounded border px-3 py-1.5 text-sm ${
                  s === size
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                    : "border-neutral-300 dark:border-neutral-700"
                }`}
              >
                {s || "Unico"}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-sm text-neutral-500">
        {selectedVariant
          ? selectedVariant.stock > 0
            ? `Stock disponible: ${selectedVariant.stock}`
            : "Sin stock para esta combinacion"
          : "Esa combinacion no existe"}
      </p>

      {/* Codigo de referencia de la variante (task #86): mismo criterio que
          se pidio en otras pantallas (recibo, admin) -- el owner queria
          poder identificar cada variante por su codigo tambien en la ficha
          publica, no solo del lado del admin. */}
      {selectedVariant?.sku && (
        <p className="-mt-2 font-mono text-xs text-neutral-400">Codigo: {selectedVariant.sku}</p>
      )}

      <div className="flex items-center gap-3">
        <label htmlFor="quantity" className="text-sm font-medium">
          Cantidad
        </label>
        <input
          id="quantity"
          type="number"
          min={1}
          max={selectedVariant?.stock ?? 1}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
          disabled={!canAddToCart}
          className="w-20 rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <button
        type="button"
        onClick={handleAddToCart}
        disabled={!canAddToCart || isPending}
        className="flex items-center justify-center gap-2 rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {isPending && <Spinner size={14} />}
        {isPending ? "Agregando..." : hasAnyStock ? "Agregar al carrito" : "Sin stock"}
      </button>

      <CartDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        items={drawerItems}
        total={drawerTotal}
      />
    </div>
  );
}
