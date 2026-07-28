"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { initiateCustomOrderPayment, type CustomOrderRow } from "@/lib/custom-orders/actions";
import { Badge, type BadgeProps } from "@/components/ui/badge";

const STATUS_LABELS: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
  pendiente: { label: "Pendiente de cotizar", variant: "neutral" },
  cotizado: { label: "Cotizado", variant: "info" },
  pagado: { label: "Pagado", variant: "success" },
  en_impresion: { label: "En impresion", variant: "warning" },
  listo: { label: "Listo para entregar", variant: "accent" },
  entregado: { label: "Entregado", variant: "success" },
  rechazado: { label: "Rechazado", variant: "danger" },
  cancelado: { label: "Cancelado", variant: "neutral" },
};

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("es-UY", { year: "numeric", month: "short", day: "numeric" });
}

export function PedidosClient({ orders }: { orders: CustomOrderRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [payingId, setPayingId] = useState<string | null>(null);

  function handlePay(id: string) {
    setPayingId(id);
    startTransition(async () => {
      try {
        const { initPoint } = await initiateCustomOrderPayment(id);
        // Recarga completa hacia el Checkout Pro de Mercado Pago, mismo
        // criterio que checkoutCart en /carrito.
        window.location.assign(initPoint);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo iniciar el pago.");
        setPayingId(null);
      }
    });
  }

  if (orders.length === 0) {
    return <p className="mt-4 text-neutral-500">Todavia no hiciste ningun pedido a medida.</p>;
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      {orders.map((order) => {
        const status = STATUS_LABELS[order.status] ?? { label: order.status, variant: "neutral" as const };
        const specs = [order.material, order.color, order.approxSize].filter(Boolean).join(" · ");

        return (
          <div key={order.id} className="rounded border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{order.fileName}</p>
                <p className="text-xs text-neutral-500">{formatDate(order.createdAt)}</p>
              </div>
              <Badge variant={status.variant} className="shrink-0">
                {status.label}
              </Badge>
            </div>

            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              {specs || "Sin specs adicionales"} · Cantidad: {order.quantity}
            </p>

            {order.notes && <p className="mt-1 text-xs text-neutral-500">Notas: {order.notes}</p>}

            {order.status === "cotizado" && (
              <div className="mt-3 rounded bg-blue-50 p-3 dark:bg-blue-950/50">
                <p className="text-sm font-medium">
                  Cotizacion: {order.quotedPrice ? formatCurrency(Number(order.quotedPrice)) : "-"}
                </p>
                {order.quotedNotes && (
                  <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{order.quotedNotes}</p>
                )}
                <button
                  type="button"
                  onClick={() => handlePay(order.id)}
                  disabled={isPending && payingId === order.id}
                  className="mt-2 rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
                >
                  {isPending && payingId === order.id ? "Procesando..." : "Pagar"}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
