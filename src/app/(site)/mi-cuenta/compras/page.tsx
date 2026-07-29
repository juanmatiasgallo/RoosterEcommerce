import Link from "next/link";
import { getMyOrders } from "@/lib/orders/actions";
import { formatCurrency } from "@/lib/format";
import { OrderStatusTracker } from "@/components/order-status-tracker";

// Consulta la DB directo (las compras del usuario logueado): sin esto, el
// build de Docker en EasyPanel la pre-renderiza en build time y falla (no
// tiene red hacia la base ahi) — mismo criterio que /mi-cuenta/pedidos.
export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("es-UY", { year: "numeric", month: "short", day: "numeric" });
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  mercado_pago: "Mercado Pago",
  transferencia: "Transferencia",
  abitab: "Abitab",
  redpagos: "Red Pagos",
  mi_dinero: "Debito Mi Dinero",
  prex: "Prex",
  contra_entrega: "Pago contra entrega",
};

/**
 * Requiere sesion, ya protegido en src/proxy.ts (/mi-cuenta/*). Muestra las
 * compras de catalogo del usuario logueado (source = "catalogo"), separado
 * de /mi-cuenta/pedidos que es solo pedidos a medida — ver task #88/#91.
 */
export default async function MiCuentaComprasPage() {
  const orders = await getMyOrders();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Mis compras</h1>
      <p className="mt-1 text-neutral-500">Historial de tus compras del catalogo.</p>

      {orders.length === 0 ? (
        <p className="mt-6 text-neutral-500">
          Todavia no tenes compras.{" "}
          <Link href="/#catalogo" className="underline">
            Ver catalogo
          </Link>
          .
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {orders.map((row) => (
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
        </div>
      )}
    </div>
  );
}
