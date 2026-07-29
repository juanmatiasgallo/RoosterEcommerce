"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { confirmManualPayment, updateOrderStatus, type AdminOrderRow } from "@/lib/orders/actions";
import { Badge, type BadgeProps } from "@/components/ui/badge";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  mercado_pago: "Mercado Pago",
  transferencia: "Transferencia",
  abitab: "Abitab",
  redpagos: "Red Pagos",
  mi_dinero: "Debito Mi Dinero",
  prex: "Prex",
  contra_entrega: "Pago contra entrega",
};

const STATUS_LABELS: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
  pendiente_confirmacion: { label: "Orden de servicio — sin confirmar", variant: "warning" },
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

// shippingAddress es jsonb sin tipo estricto en el schema (puede venir de
// ordenes viejas sin este campo, o con forma distinta) — se lee con cuidado
// en vez de asumir la forma exacta de ShippingAddress.
function formatShippingAddress(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const address = value as Record<string, unknown>;
  return [address.calle, address.numero, address.piso, address.ciudad, address.departamento]
    .filter((part) => typeof part === "string" && part.length > 0)
    .join(" ");
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

  function handleConfirmManual(id: string) {
    setUpdatingId(id);
    startTransition(async () => {
      try {
        await confirmManualPayment(id);
        toast.success("Pago confirmado.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo confirmar el pago.");
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

        const isManualPending = row.order.status === "pendiente_confirmacion";

        return (
          <div
            key={row.order.id}
            className={`rounded border p-4 ${
              isManualPending
                ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
                : "border-neutral-200 dark:border-neutral-800"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">
                  Orden #{row.order.orderNumber} — {row.customerName ?? row.customerEmail}
                </p>
                <p className="text-xs text-neutral-500">
                  {formatDate(row.order.createdAt)} ·{" "}
                  {row.order.source === "pedido_custom" ? "Pedido a medida" : "Catalogo"} ·{" "}
                  {PAYMENT_METHOD_LABELS[row.order.paymentMethod] ?? row.order.paymentMethod}
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

            {Boolean(row.order.shippingAddress) && (
              <p className="mt-2 text-xs text-neutral-500">
                Envio: {formatShippingAddress(row.order.shippingAddress)}
                {Number(row.order.shippingCost) > 0 && ` · ${formatCurrency(Number(row.order.shippingCost))}`}
              </p>
            )}

            {row.order.receiptUrl && (
              <a
                href={row.order.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs text-accent underline"
              >
                Ver comprobante subido
              </a>
            )}

            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm font-medium">{formatCurrency(Number(row.order.total))}</p>
              {isManualPending && (
                <button
                  type="button"
                  onClick={() => handleConfirmManual(row.order.id)}
                  disabled={isPending && updatingId === row.order.id}
                  className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 hover:bg-amber-700"
                >
                  {isPending && updatingId === row.order.id ? "Confirmando..." : "Confirmar pago recibido"}
                </button>
              )}
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
