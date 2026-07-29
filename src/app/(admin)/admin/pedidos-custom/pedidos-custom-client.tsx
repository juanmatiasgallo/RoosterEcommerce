"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/format";
import type { AdminCustomOrderRow } from "@/lib/custom-orders/actions";
import { Badge } from "@/components/ui/badge";
import { CotizarFormDialog } from "./cotizar-form-dialog";

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("es-UY", { year: "numeric", month: "short", day: "numeric" });
}

function FileLink({ order }: { order: AdminCustomOrderRow }) {
  return (
    <a
      href={order.fileUrl}
      download={order.fileName}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
    >
      Ver archivo ({order.fileName})
    </a>
  );
}

export function PedidosCustomClient({
  pendientes,
  cotizados,
}: {
  pendientes: AdminCustomOrderRow[];
  cotizados: AdminCustomOrderRow[];
}) {
  const [cotizando, setCotizando] = useState<AdminCustomOrderRow | null>(null);

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="text-xl font-semibold">Pedidos a medida por cotizar</h1>

        {pendientes.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">No hay pedidos pendientes de cotizar.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {pendientes.map((order) => (
              <div
                key={order.id}
                className="rounded border border-neutral-200 p-4 transition-shadow hover:shadow-sm dark:border-neutral-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{order.fileName}</p>
                    <p className="text-xs text-neutral-500">{formatDate(order.createdAt)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCotizando(order)}
                    className="shrink-0 rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white active:scale-[0.98] dark:bg-neutral-100 dark:text-neutral-900"
                  >
                    Cotizar
                  </button>
                </div>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  {[order.material, order.color, order.approxSize].filter(Boolean).join(" · ") ||
                    "Sin specs adicionales"}{" "}
                  · Cantidad: {order.quantity}
                </p>
                {order.notes && <p className="mt-1 text-xs text-neutral-500">Notas: {order.notes}</p>}
                <div className="mt-2">
                  <FileLink order={order} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Ya cotizados</h2>

        {cotizados.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">Todavia no cotizaste ningun pedido.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {cotizados.map((order) => (
              <div
                key={order.id}
                className="rounded border border-neutral-200 p-4 transition-shadow hover:shadow-sm dark:border-neutral-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{order.fileName}</p>
                    <p className="text-xs text-neutral-500">{formatDate(order.createdAt)}</p>
                  </div>
                  <Badge variant="info" className="shrink-0">
                    Cotizado
                  </Badge>
                </div>
                <p className="mt-2 text-sm font-medium">
                  {order.quotedPrice ? formatCurrency(Number(order.quotedPrice)) : "-"}
                </p>
                {order.quotedNotes && (
                  <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{order.quotedNotes}</p>
                )}
                <div className="mt-2">
                  <FileLink order={order} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {cotizando && <CotizarFormDialog order={cotizando} onClose={() => setCotizando(null)} />}
    </div>
  );
}
