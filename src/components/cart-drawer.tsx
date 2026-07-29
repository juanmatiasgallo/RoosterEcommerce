"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { CartRow } from "@/lib/cart/actions";

// Panel lateral que aparece justo despues de agregar algo al carrito, con
// el contenido actualizado y dos caminos claros: seguir de largo a pagar, o
// seguir mirando el catalogo — evita que el usuario se pregunte "se agrego
// de verdad?" con solo un toast chiquito (ver task pedida por el owner).
export function CartDrawer({
  open,
  onClose,
  items,
  total,
}: {
  open: boolean;
  onClose: () => void;
  items: CartRow[];
  total: number;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="animate-in fade-in-0 absolute inset-0 bg-black/40 duration-200"
      />
      <div className="animate-in slide-in-from-right fade-in-0 absolute top-0 right-0 flex h-full w-full max-w-sm flex-col bg-white shadow-xl duration-300 dark:bg-neutral-950">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <p className="font-medium">Agregado al carrito</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {items.length === 0 ? (
            <p className="text-sm text-neutral-500">Tu carrito esta vacio.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {items.map((row) => (
                <li key={row.item.id} className="flex items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium">{row.product.name}</p>
                    <p className="text-xs text-neutral-500">
                      {[row.variant.material, row.variant.color, row.variant.size].filter(Boolean).join(" ")} ·{" "}
                      {row.item.quantity}x
                    </p>
                  </div>
                  <p className="shrink-0 font-medium">{formatCurrency(Number(row.variant.price) * row.item.quantity)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-neutral-200 px-4 py-4 dark:border-neutral-800">
          <div className="mb-3 flex items-center justify-between text-sm font-medium">
            <span>Subtotal</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <div className="flex flex-col gap-2">
            <Link
              href="/checkout"
              className="rounded bg-accent px-4 py-2 text-center text-sm font-medium text-accent-foreground active:scale-[0.98] hover:bg-accent-hover"
            >
              Finalizar compra
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-neutral-300 px-4 py-2 text-sm active:scale-[0.98] dark:border-neutral-700"
            >
              Seguir comprando
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
