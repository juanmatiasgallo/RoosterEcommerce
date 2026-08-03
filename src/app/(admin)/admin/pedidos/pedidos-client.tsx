"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Truck } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { confirmManualPayment, setOrderTracking, updateOrderStatus, type AdminOrderRow } from "@/lib/orders/actions";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { OrderStatusTracker } from "@/components/order-status-tracker";
import { usePagination } from "@/hooks/use-pagination";

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
  en_cola: { label: "En cola", variant: "warning" },
  imprimiendo: { label: "Imprimiendo", variant: "warning" },
  postprocesado: { label: "Postprocesado", variant: "warning" },
  enviado: { label: "Enviado", variant: "accent" },
  entregado: { label: "Entregado", variant: "success" },
  cancelado: { label: "Cancelado", variant: "neutral" },
};

type AdvanceableStatus = "en_cola" | "imprimiendo" | "postprocesado" | "enviado" | "entregado";

const PIPELINE_STATUSES = new Set(["pagado", "en_cola", "imprimiendo", "postprocesado", "enviado", "entregado"]);

const NEXT_STATUS: Record<string, { value: AdvanceableStatus; label: string } | undefined> = {
  pagado: { value: "en_cola", label: "Marcar en cola" },
  en_cola: { value: "imprimiendo", label: "Marcar imprimiendo" },
  imprimiendo: { value: "postprocesado", label: "Marcar postprocesado" },
  postprocesado: { value: "enviado", label: "Marcar enviado" },
  enviado: { value: "entregado", label: "Marcar entregado" },
};

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
  // Formulario de seguimiento (task #41): un solo id abierto a la vez, con
  // sus propios valores locales -- se precarga con lo ya guardado si existia
  // (para editar), o vacio si es la primera carga.
  const [trackingFormId, setTrackingFormId] = useState<string | null>(null);
  const [trackingCarrier, setTrackingCarrier] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const { page, setPage, totalPages, pageItems: pagedOrders } = usePagination(orders);

  function openTrackingForm(id: string, carrier: string | null, code: string | null) {
    setTrackingFormId(id);
    setTrackingCarrier(carrier ?? "DAC");
    setTrackingCode(code ?? "");
  }

  function handleSaveTracking(id: string) {
    setUpdatingId(id);
    startTransition(async () => {
      try {
        await setOrderTracking(id, { carrier: trackingCarrier, code: trackingCode });
        toast.success("Codigo de seguimiento guardado.");
        setTrackingFormId(null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar el seguimiento.");
      } finally {
        setUpdatingId(null);
      }
    });
  }

  function handleAdvance(id: string, next: AdvanceableStatus) {
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
      {pagedOrders.map((row) => {
        const status = STATUS_LABELS[row.order.status] ?? { label: row.order.status, variant: "neutral" as const };
        const next = NEXT_STATUS[row.order.status];

        const isManualPending = row.order.status === "pendiente_confirmacion";

        return (
          <div
            key={row.order.id}
            className={`rounded border p-4 transition-shadow hover:shadow-sm ${
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
                  {item.variantSku && (
                    <code className="ml-1.5 rounded bg-neutral-100 px-1 py-0.5 text-xs text-neutral-500 dark:bg-neutral-800">
                      {item.variantSku}
                    </code>
                  )}
                </li>
              ))}
            </ul>

            {Boolean(row.order.shippingAddress) && (
              <p className="mt-2 text-xs text-neutral-500">
                Envio: {formatShippingAddress(row.order.shippingAddress)}
                {Number(row.order.shippingCost) > 0 && ` · ${formatCurrency(Number(row.order.shippingCost))}`}
              </p>
            )}

            {Number(row.order.discountAmount) > 0 && (
              <p className="mt-1 text-xs text-green-700 dark:text-green-400">
                Descuento aplicado: -{formatCurrency(Number(row.order.discountAmount))}
                {row.order.couponCode && ` (cupon ${row.order.couponCode})`}
              </p>
            )}

            {/* Seguimiento del envio (task #41): solo tiene sentido para
                ordenes ya despachables (pagadas en adelante) -- antes de eso
                no hay nada que rastrear todavia. */}
            {PIPELINE_STATUSES.has(row.order.status) && (
              <div className="mt-2">
                {trackingFormId === row.order.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={trackingCarrier}
                      onChange={(event) => setTrackingCarrier(event.target.value)}
                      placeholder="Transportista (ej. DAC)"
                      className="w-36 rounded border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                    />
                    <input
                      value={trackingCode}
                      onChange={(event) => setTrackingCode(event.target.value)}
                      placeholder="Codigo de seguimiento"
                      className="w-40 rounded border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveTracking(row.order.id)}
                      disabled={isPending && updatingId === row.order.id}
                      className="rounded bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrackingFormId(null)}
                      className="text-xs text-neutral-500 hover:underline"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : row.order.trackingCarrier && row.order.trackingCode ? (
                  <p className="flex items-center gap-1.5 text-xs text-neutral-500">
                    <Truck size={13} className="text-accent" />
                    {row.order.trackingCarrier}: <code className="text-neutral-700 dark:text-neutral-300">{row.order.trackingCode}</code>
                    <button
                      type="button"
                      onClick={() => openTrackingForm(row.order.id, row.order.trackingCarrier, row.order.trackingCode)}
                      className="text-accent hover:underline"
                    >
                      Editar
                    </button>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => openTrackingForm(row.order.id, null, null)}
                    className="flex items-center gap-1.5 text-xs text-accent hover:underline"
                  >
                    <Truck size={13} />
                    Agregar codigo de seguimiento
                  </button>
                )}
              </div>
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

            {PIPELINE_STATUSES.has(row.order.status) && (
              <div className="mt-3">
                <OrderStatusTracker status={row.order.status} />
              </div>
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

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
