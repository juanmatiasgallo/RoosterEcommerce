"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { initiateCustomOrderPayment, type CustomOrderRow } from "@/lib/custom-orders/actions";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  PaymentMethodPicker,
  type ManualPaymentMethodOption,
  type PaymentMethodValue,
} from "@/components/payment-method-picker";

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

type ManualOrderResult = { orderNumber: number; methodLabel: string; instructions: string };

function CotizadoActions({ order, manualPaymentMethods }: { order: CustomOrderRow; manualPaymentMethods: ManualPaymentMethodOption[] }) {
  const [isPending, startTransition] = useTransition();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodValue>("mercado_pago");
  const [manualResult, setManualResult] = useState<ManualOrderResult | null>(null);

  function handlePay() {
    startTransition(async () => {
      try {
        const result = await initiateCustomOrderPayment(order.id, paymentMethod);
        if (result.type === "manual") {
          setManualResult(result);
          return;
        }
        // Recarga completa hacia el Checkout Pro de Mercado Pago, mismo
        // criterio que checkoutCart en /carrito.
        window.location.assign(result.initPoint);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo iniciar el pago.");
      }
    });
  }

  if (manualResult) {
    return (
      <div className="mt-3 rounded bg-neutral-100 p-3 dark:bg-neutral-900">
        <p className="text-sm font-medium">Orden de servicio #{manualResult.orderNumber} creada</p>
        <p className="mt-1 text-xs text-neutral-500">
          Te mandamos un mail con estos mismos datos. Confirmamos el pago a mano en cuanto lo verifiquemos.
        </p>
        <p className="mt-2 text-sm font-medium">{manualResult.methodLabel}</p>
        <p className="mt-1 whitespace-pre-line text-sm text-neutral-600 dark:text-neutral-400">
          {manualResult.instructions}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      <PaymentMethodPicker manualPaymentMethods={manualPaymentMethods} value={paymentMethod} onChange={setPaymentMethod} />
      <button
        type="button"
        onClick={handlePay}
        disabled={isPending}
        className="self-start rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {isPending ? "Procesando..." : paymentMethod === "mercado_pago" ? "Pagar" : "Generar orden de servicio"}
      </button>
    </div>
  );
}

export function PedidosClient({
  orders,
  manualPaymentMethods,
}: {
  orders: CustomOrderRow[];
  manualPaymentMethods: ManualPaymentMethodOption[];
}) {
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
                <CotizadoActions order={order} manualPaymentMethods={manualPaymentMethods} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
