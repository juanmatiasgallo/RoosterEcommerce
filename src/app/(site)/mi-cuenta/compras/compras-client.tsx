"use client";

import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/format";
import type { MyOrderRow } from "@/lib/orders/actions";
import { OrderStatusTracker } from "@/components/order-status-tracker";
import { Pagination } from "@/components/ui/pagination";
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

// Separado de page.tsx (Server Component) solo para poder usar usePagination
// (task #146) -- el fetch de datos se queda en el Server Component, esto es
// puramente presentacion + estado de pagina.
export function ComprasClient({ orders }: { orders: MyOrderRow[] }) {
  const { page, setPage, totalPages, pageItems } = usePagination(orders);

  return (
    <div className="mt-6 flex flex-col gap-4">
      {pageItems.map((row) => (
        <div key={row.order.id} className="rounded border border-neutral-200 p-4 dark:border-neutral-800">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">Orden #{row.order.orderNumber}</p>
              <p className="text-xs text-neutral-500">
                {formatDate(row.order.createdAt)} ·{" "}
                {PAYMENT_METHOD_LABELS[row.order.paymentMethod] ?? row.order.paymentMethod}
              </p>
            </div>
            <p className="text-sm font-medium">{formatCurrency(Number(row.order.total))}</p>
          </div>

          <ul className="mt-3 flex flex-col gap-1">
            {row.items.map((item) => (
              <li key={item.id} className="text-sm text-neutral-600 dark:text-neutral-400">
                {item.quantity}x {item.productName}
                {item.variantLabel ? ` (${item.variantLabel})` : ""}
              </li>
            ))}
          </ul>

          {Number(row.order.discountAmount) > 0 && (
            <p className="mt-2 text-xs text-green-700 dark:text-green-400">
              Descuento aplicado: -{formatCurrency(Number(row.order.discountAmount))}
              {row.order.couponCode && ` (cupon ${row.order.couponCode})`}
            </p>
          )}

          <div className="mt-4">
            <OrderStatusTracker status={row.order.status} />
          </div>

          <div className="mt-3 text-right">
            <Link href={`/mi-cuenta/compras/${row.order.id}`} className="text-sm underline">
              Ver comprobante
            </Link>
          </div>
        </div>
      ))}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
