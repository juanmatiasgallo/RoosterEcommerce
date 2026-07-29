"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { updateOrderStatus, type AdminOrderRow } from "@/lib/orders/actions";
import { Badge, type BadgeProps } from "@/components/ui/badge";

const STATUS_LABELS: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
  pagado: { label: "Pagado", variant: "info" },
  en_preparacion: { label: "En preparacion", variant: "warning" },
  enviado: { label: "Enviado", variant: "accent" },
  entregado: { label: "Entregado", variant: "success" },
  cancelado: { label: "Cancelado", variant: "neutral" },
};

const NEXT_STATUS: Record<string, { value: "en_preparacion" | "enviado" | "entregado"; label: string } | undefined> = {
  pagado: { value: "en_preparacion", label: "Marcar en preparacion" },
  en_preparacion: { value: "enviado", label: "Marcar enviado" },
  enviado: { value: "entregado", label: "Marcar entregado" },
};

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("es-UY", { year: "numeric", month: "short", day: "numeric" });
}

export function PedidosClient({ orders }: { orders: AdminOrderRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  function handleAdvance(id: string, next: "en_preparacion" | "enviado" | "entregado") {
    setUpdatingId(id);
    startTransition(async () => {
      try {
        await updateOrderStatus(id, next);
        toast.success("Estado actualizado.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo actualizar el estado.");
      } finally {
        setUpdatingId(null);
      }
    });
  }

  if (orders.length === 0) {
    return <p className="mt-4 text-neutral-500">Todavia no hay ordenes pagadas.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {orders.map((row) => {
        const status = STATUS_LABELS[row.order.status] ?? { label: row.order.status, variant: "neutral" as const };
        const next = NEXT_STATUS[row.order.status];

        return (
          <div key={row.order.id} className="rounded border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{row.customerName ?? row.customerEmail}</p>
                <p className="text-xs text-neutral-500">
                  {formatDate(row.order.createdAt)} ·{" "}
                  {row.order.source === "pedido_custom" ? "Pedido a medida" : "Catalogo"}
                </p>
              </div>
              <Badge variant={status.variant} className="shrink-0">
                {status.label}
              </Badge>
            </div>

            <ul className="mt-2 flex flex-col gap-1">
              {row.items.map((item) => (
                <li key={item.id} className="text-sm text-neutral-600 dark:text-neutral-400">
                  {item.quantity}x {item.productName}
                  {item.variantLabel ? ` (${item.variantLabel})` : ""}
                </li>
              ))}
            </ul>

            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm font-medium">{formatCurrency(Number(row.order.total))}</p>
              {next && (
                <button
                  type="button"
                  onClick={() => handleAdvance(row.order.id, next.value)}
                  disabled={isPending && updatingId === row.order.id}
                  className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
                >
                  {isPending && updatingId === row.order.id ? "Actualizando..." : next.label}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
