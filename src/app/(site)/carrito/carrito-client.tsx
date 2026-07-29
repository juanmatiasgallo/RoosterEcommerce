"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { removeFromCart, updateCartItem, type CartRow } from "@/lib/cart/actions";
import { checkoutCart } from "@/lib/orders/actions";
import {
  PaymentMethodPicker,
  type ManualPaymentMethodOption,
  type PaymentMethodValue,
} from "@/components/payment-method-picker";

function CartItemRow({ row }: { row: CartRow }) {
  const [quantity, setQuantity] = useState(row.item.quantity);
  const [isPending, startTransition] = useTransition();

  // Debounce ~300ms antes de pegarle al server con cada cambio de cantidad,
  // mismo criterio que el resto de los inputs numericos del proyecto.
  useEffect(() => {
    if (quantity === row.item.quantity) return;

    const timeout = setTimeout(() => {
      startTransition(async () => {
        try {
          await updateCartItem(row.item.id, quantity);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "No se pudo actualizar la cantidad.");
          setQuantity(row.item.quantity);
        }
      });
    }, 300);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantity]);

  function handleRemove() {
    startTransition(async () => {
      try {
        await removeFromCart(row.item.id);
        toast.success("Producto quitado del carrito.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo quitar el producto.");
      }
    });
  }

  const subtotal = Number(row.variant.price) * quantity;
  const label = [row.variant.material, row.variant.color, row.variant.size].filter(Boolean).join(" ");

  return (
    <div
      className={`flex items-center justify-between gap-4 rounded border border-neutral-200 p-3 transition-opacity dark:border-neutral-800 ${
        isPending ? "opacity-60" : "opacity-100"
      }`}
    >
      <div>
        <p className="font-medium">{row.product.name}</p>
        <p className="text-xs text-neutral-500">{label}</p>
        <p className="text-sm text-neutral-500">{formatCurrency(Number(row.variant.price))} c/u</p>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="number"
          min={1}
          max={row.variant.stock}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
          disabled={isPending}
          className="w-16 rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <p className="w-24 text-right text-sm font-medium">{formatCurrency(subtotal)}</p>
        <button
          type="button"
          onClick={handleRemove}
          disabled={isPending}
          className="text-xs text-red-600 hover:underline disabled:opacity-50"
        >
          Quitar
        </button>
      </div>
    </div>
  );
}

type ManualOrderResult = { orderNumber: number; methodLabel: string; instructions: string };

export function CarritoClient({
  items,
  total,
  manualPaymentMethods,
  vacationMode = false,
  vacationMessage,
}: {
  items: CartRow[];
  total: number;
  manualPaymentMethods: ManualPaymentMethodOption[];
  vacationMode?: boolean;
  vacationMessage?: string | null;
}) {
  const [isCheckingOut, startCheckout] = useTransition();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodValue>("mercado_pago");
  const [manualResult, setManualResult] = useState<ManualOrderResult | null>(null);

  function handleCheckout() {
    startCheckout(async () => {
      try {
        const result = await checkoutCart(paymentMethod);
        if (result.type === "manual") {
          setManualResult(result);
          return;
        }
        // Recarga completa (no router.push): sale del SPA hacia el
        // Checkout Pro de Mercado Pago, no hay nada que preservar del
        // cache de Next del lado de aca.
        window.location.assign(result.initPoint);
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo iniciar el pago.";
        if (message.includes("iniciar sesion")) {
          window.location.assign(`/login?callbackUrl=${encodeURIComponent("/carrito")}`);
          return;
        }
        toast.error(message);
      }
    });
  }

  // Orden de servicio ya creada: se muestra la confirmacion en la misma
  // pagina en vez de navegar a otro lado — el carrito ya se vacio en el
  // server, no tiene sentido volver a mostrarlo.
  if (manualResult) {
    return (
      <div className="mt-6 flex flex-col gap-4 rounded border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="font-semibold">Orden de servicio #{manualResult.orderNumber} creada</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Te mandamos un mail con estos mismos datos. En cuanto confirmemos que el pago llego, vas a ver la orden
          actualizada en <span className="underline">tu cuenta</span>.
        </p>
        <div className="rounded bg-neutral-100 p-3 text-sm dark:bg-neutral-900">
          <p className="font-medium">{manualResult.methodLabel}</p>
          <p className="mt-1 whitespace-pre-line text-neutral-600 dark:text-neutral-400">
            {manualResult.instructions}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      {items.map((row) => (
        <CartItemRow key={row.item.id} row={row} />
      ))}

      <div className="mt-2 flex items-center justify-between border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <span className="text-sm text-neutral-500">Total</span>
        <span className="text-lg font-semibold">{formatCurrency(total)}</span>
      </div>

      <PaymentMethodPicker
        manualPaymentMethods={manualPaymentMethods}
        value={paymentMethod}
        onChange={setPaymentMethod}
      />

      {vacationMode ? (
        <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          {vacationMessage || "La tienda no esta recibiendo pedidos en este momento."}
        </p>
      ) : (
        <button
          type="button"
          onClick={handleCheckout}
          disabled={isCheckingOut}
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {isCheckingOut
            ? "Procesando..."
            : paymentMethod === "mercado_pago"
              ? "Ir a pagar"
              : "Generar orden de servicio"}
        </button>
      )}
    </div>
  );
}
