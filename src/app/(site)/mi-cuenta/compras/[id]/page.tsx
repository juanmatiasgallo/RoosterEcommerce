import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { getReceiptView } from "@/lib/receipt/actions";
import { OrderStatusTracker } from "@/components/order-status-tracker";
import { OrderReceiptCard } from "@/components/order-receipt-card";
import { PurchaseConfirmedTracker } from "@/components/purchase-confirmed-tracker";

// Consulta la DB directo (comprobante de una orden puntual del usuario
// logueado) — mismo motivo que el resto de /mi-cuenta/*: sin esto el build
// de Docker en EasyPanel la pre-renderiza en build time y falla (sin red
// hacia la base ahi).
export const dynamic = "force-dynamic";

/**
 * Comprobante de una compra de catalogo: pagina web con QR (task #103),
 * plantilla propia (task #6, ver order-receipt-card.tsx) que el cliente
 * puede ver desde /mi-cuenta/compras o desde el link que se le manda por
 * mail al confirmarse el pago. El mismo QR y los mismos datos se usan para
 * el PDF descargable, generado en /api/pedidos/[id]/recibo.pdf.
 */
export default async function ComprobanteCompraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const receipt = await getReceiptView(id);
  if (!receipt) notFound();

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <PurchaseConfirmedTracker
        orderId={receipt.orderId}
        orderNumber={receipt.orderNumber}
        status={receipt.status}
        total={Number(receipt.total)}
        paymentMethodLabel={receipt.paymentMethodLabel}
      />

      <div className="flex items-center justify-between gap-2">
        <Link href="/mi-cuenta/compras" className="text-sm text-neutral-500 underline">
          ← Volver a mis compras
        </Link>
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

      <div className="mt-4">
        <OrderReceiptCard
          orderId={receipt.orderId}
          orderNumber={receipt.orderNumber}
          createdAt={receipt.createdAt}
          paymentMethodLabel={receipt.paymentMethodLabel}
          items={receipt.items}
          shippingCost={receipt.shippingCost}
          discountAmount={receipt.discountAmount}
          couponCode={receipt.couponCode}
          total={receipt.total}
          customerName={receipt.customerName}
          storeName={receipt.storeName}
          shippingAddress={receipt.shippingAddress}
          qrDataUrl={receipt.qrDataUrl}
          trackingCarrier={receipt.trackingCarrier}
          trackingCode={receipt.trackingCode}
        />
      </div>
    </div>
  );
}
