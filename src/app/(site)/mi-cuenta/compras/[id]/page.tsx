import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { getReceiptData } from "@/lib/receipt/actions";
import { generateReceiptQrDataUrl } from "@/lib/receipt/pdf";
import { formatCurrency } from "@/lib/format";
import { OrderStatusTracker } from "@/components/order-status-tracker";

// Consulta la DB directo (comprobante de una orden puntual del usuario
// logueado) — mismo motivo que el resto de /mi-cuenta/*: sin esto el build
// de Docker en EasyPanel la pre-renderiza en build time y falla (sin red
// hacia la base ahi).
export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("es-UY", { year: "numeric", month: "long", day: "numeric" });
}

/**
 * Comprobante de una compra de catalogo: pagina web con QR (task #103) que
 * el cliente puede ver desde /mi-cuenta/compras o desde el link que se le
 * manda por mail al confirmarse el pago. El mismo QR y los mismos datos se
 * usan para el PDF descargable, generado en /api/pedidos/[id]/recibo.pdf.
 */
export default async function ComprobanteCompraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const receipt = await getReceiptData(id);
  if (!receipt) notFound();

  const qrDataUrl = await generateReceiptQrDataUrl(id);

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Link href="/mi-cuenta/compras" className="text-sm text-neutral-500 underline">
        ← Volver a mis compras
      </Link>

      <div className="mt-4 rounded-lg border border-neutral-200 p-6 dark:border-neutral-800">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">Orden #{receipt.orderNumber}</h1>
            <p className="text-sm text-neutral-500">{formatDate(receipt.createdAt)}</p>
          </div>
          <a
            href={`/api/pedidos/${id}/recibo.pdf`}
            className="flex items-center gap-1.5 rounded border border-neutral-300 px-3 py-1.5 text-sm font-medium dark:border-neutral-700"
          >
            <Download size={14} />
            PDF
          </a>
        </div>

        <div className="mt-4">
          <OrderStatusTracker status={receipt.status} />
        </div>

        <ul className="mt-6 flex flex-col gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          {receipt.items.map((item, index) => (
            <li key={index} className="flex items-center justify-between text-sm">
              <span className="text-neutral-600 dark:text-neutral-400">
                {item.quantity}x {item.productName}
                {item.variantLabel ? ` (${item.variantLabel})` : ""}
              </span>
              <span>{formatCurrency(Number(item.unitPrice) * item.quantity)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-col gap-1 border-t border-neutral-200 pt-4 text-sm dark:border-neutral-800">
          {Number(receipt.shippingCost) > 0 && (
            <div className="flex justify-between text-neutral-500">
              <span>Envio</span>
              <span>{formatCurrency(Number(receipt.shippingCost))}</span>
            </div>
          )}
          {Number(receipt.discountAmount) > 0 && (
            <div className="flex justify-between text-green-700 dark:text-green-400">
              <span>Descuento{receipt.couponCode ? ` (cupon ${receipt.couponCode})` : ""}</span>
              <span>-{formatCurrency(Number(receipt.discountAmount))}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span>{formatCurrency(Number(receipt.total))}</span>
          </div>
          <p className="mt-1 text-xs text-neutral-500">Medio de pago: {receipt.paymentMethodLabel}</p>
        </div>

        <div className="mt-6 flex flex-col items-center gap-2 border-t border-neutral-200 pt-6 dark:border-neutral-800">
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL generado en el server, no aplica next/image */}
          <img src={qrDataUrl} alt="Codigo QR del comprobante" width={160} height={160} />
          <p className="text-center text-xs text-neutral-500">Escanealo para volver a este comprobante</p>
        </div>
      </div>
    </div>
  );
}
