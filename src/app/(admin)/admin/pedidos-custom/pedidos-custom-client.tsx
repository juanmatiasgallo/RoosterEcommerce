"use client";

import { useState } from "react";
import { Box } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import type { AdminCustomOrderRow } from "@/lib/custom-orders/actions";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { Model3DDialog } from "@/components/model-3d-dialog";
import { getModel3DExtension } from "@/components/model-3d-viewer";
import { CotizarFormDialog } from "./cotizar-form-dialog";

function FileLink({ order, onPreview }: { order: AdminCustomOrderRow; onPreview: (order: AdminCustomOrderRow) => void }) {
  return (
    <div className="flex items-center gap-3">
      <a
        href={order.fileUrl}
        download={order.fileName}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
      >
        Ver archivo ({order.fileName})
      </a>
      {getModel3DExtension(order.fileName) && (
        <button
          type="button"
          onClick={() => onPreview(order)}
          className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 underline hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          <Box size={12} />
          Ver en 3D
        </button>
      )}
    </div>
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
  const [previewOrder, setPreviewOrder] = useState<AdminCustomOrderRow | null>(null);
  const previewExtension = previewOrder ? getModel3DExtension(previewOrder.fileName) : null;
  // Dos listas independientes en esta pantalla -- cada una con su propia
  // pagina, no comparten estado (task #146).
  const pendientesPage = usePagination(pendientes);
  const cotizadosPage = usePagination(cotizados);

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="text-xl font-semibold">Pedidos a medida por cotizar</h1>

        {pendientes.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">No hay pedidos pendientes de cotizar.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {pendientesPage.pageItems.map((order) => (
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
                  <FileLink order={order} onPreview={setPreviewOrder} />
                </div>
              </div>
            ))}
          </div>
        )}
        <Pagination page={pendientesPage.page} totalPages={pendientesPage.totalPages} onPageChange={pendientesPage.setPage} />
      </section>

      <section>
        <h2 className="text-lg font-semibold">Ya cotizados</h2>

        {cotizados.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">Todavia no cotizaste ningun pedido.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {cotizadosPage.pageItems.map((order) => (
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
                {order.quoteValidUntil && (
                  <p className="mt-1 text-xs text-neutral-500">Valido hasta el {formatDate(order.quoteValidUntil)}</p>
                )}
                {order.quotedNotes && (
                  <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{order.quotedNotes}</p>
                )}
                <div className="mt-2 flex items-center gap-3">
                  <FileLink order={order} onPreview={setPreviewOrder} />
                  {order.quotePdfUrl && (
                    <a
                      href={order.quotePdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
                    >
                      Ver presupuesto (PDF)
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <Pagination page={cotizadosPage.page} totalPages={cotizadosPage.totalPages} onPageChange={cotizadosPage.setPage} />
      </section>

      {cotizando && <CotizarFormDialog order={cotizando} onClose={() => setCotizando(null)} />}

      {previewOrder && previewExtension && (
        <Model3DDialog
          open
          onClose={() => setPreviewOrder(null)}
          url={previewOrder.fileUrl}
          extension={previewExtension}
          title={previewOrder.fileName}
        />
      )}
    </div>
  );
}
