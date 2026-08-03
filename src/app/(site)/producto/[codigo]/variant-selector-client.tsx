"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { addToCart, getCartItems, type CartRow } from "@/lib/cart/actions";
import { Spinner } from "@/components/ui/spinner";
import { CartDrawer } from "@/components/cart-drawer";
import { trackEvent } from "@/lib/analytics/track";

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

export function VariantSelectorClient({
  variants,
  basePrice,
  productId,
  productName,
}: {
  variants: Variant[];
  basePrice: string;
  productId: string;
  productName: string;
}) {
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

  // Feedback tactil del boton (task #156): antes el unico indicio de que
  // "agregar" funciono era el drawer abriendose -- si el usuario tenia el
  // ojo en el boton (comun, sobre todo en mobile con el drawer entrando
  // desde el costado) no pasaba nada ahi. El check + "Agregado" dura poco
  // (1.1s) y vuelve solo al estado normal, no requiere que el usuario haga
  // nada para sacarlo.
  const [justAdded, setJustAdded] = useState(false);
  useEffect(() => {
    if (!justAdded) return;
    const timer = setTimeout(() => setJustAdded(false), 1100);
    return () => clearTimeout(timer);
  }, [justAdded]);

  const hasAnyStock = variants.some((v) => v.stock > 0);
  const canAddToCart = Boolean(selectedVariant) && (selectedVariant?.stock ?? 0) > 0 && quantity > 0;

  function handleAddToCart() {
    if (!canAddToCart || !selectedVariant) return;

    startTransition(async () => {
      try {
        await addToCart(selectedVariant.id, quantity);
        trackEvent("agregar_al_carrito", {
          productId,
          productName,
          variantId: selectedVariant.id,
          material: selectedVariant.material,
          quantity,
          price: Number(selectedVariant.price),
          revenue: Number(selectedVariant.price) * quantity,
          currency: "UYU",
        });
        const fresh = await getCartItems();
        setDrawerItems(fresh.items);
        setDrawerTotal(fresh.total);
        setJustAdded(true);
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
              className={`rounded border px-3 py-1.5 text-sm transition-all duration-150 active:scale-95 ${
                m === material
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                  : "border-neutral-300 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-600"
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
                className={`rounded border px-3 py-1.5 text-sm transition-all duration-150 active:scale-95 ${
                  c === color
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                    : "border-neutral-300 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-600"
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
                className={`rounded border px-3 py-1.5 text-sm transition-all duration-150 active:scale-95 ${
                  s === size
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                    : "border-neutral-300 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-600"
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
        className={`flex items-center justify-center gap-2 overflow-hidden rounded px-4 py-2 text-sm font-medium text-white transition-colors duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:text-neutral-900 ${
          justAdded ? "bg-green-600 dark:bg-green-500 dark:text-white" : "bg-neutral-900 dark:bg-neutral-100"
        }`}
      >
        {/* AnimatePresence mode="wait" (task #156): morph a un check en vez
            de solo confiar en que el usuario note que se abrio el
            CartDrawer -- da feedback justo donde tiene puesto el ojo (el
            boton que acaba de tocar), no solo en un panel que entra por el
            costado. */}
        <AnimatePresence mode="wait" initial={false}>
          {justAdded ? (
            <motion.span
              key="added"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-1.5"
            >
              <Check size={15} />
              Agregado
            </motion.span>
          ) : (
            <motion.span
              key="idle"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-2"
            >
              {isPending && <Spinner size={14} />}
              {isPending ? "Agregando..." : hasAnyStock ? "Agregar al carrito" : "Sin stock"}
            </motion.span>
          )}
        </AnimatePresence>
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
