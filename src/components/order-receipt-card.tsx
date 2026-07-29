"use client";

import { motion } from "framer-motion";
import { MapPin, Package, ShieldCheck } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { orderReferenceCode } from "@/lib/orders/reference-code";
import type { ShippingAddress } from "@/lib/orders/schema";
import type { ReceiptItem } from "@/lib/receipt/pdf";

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("es-UY", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type OrderReceiptCardProps = {
  orderId: string;
  orderNumber: number;
  createdAt: Date | string;
  paymentMethodLabel: string;
  items: ReceiptItem[];
  shippingCost: string;
  discountAmount: string;
  couponCode: string | null;
  total: string;
  customerName: string;
  storeName: string;
  shippingAddress: ShippingAddress | null;
  qrDataUrl: string;
};

// Resumen de orden con plantilla propia (task #6): antes de esto, "generar
// orden de servicio" mostraba una cajita de texto minima -- el owner mando
// de referencia el comprobante de Tata.com.uy (header de marca, codigo de
// pedido grande, datos de envio, articulos, QR) para transmitir mas
// confianza en el momento clave post-compra. Se comparte entre la pantalla
// de "orden creada" del checkout (checkout-wizard.tsx) y el comprobante
// permanente en /mi-cuenta/compras/[id], para no mantener dos plantillas.
export function OrderReceiptCard({
  orderId,
  orderNumber,
  createdAt,
  paymentMethodLabel,
  items,
  shippingCost,
  discountAmount,
  couponCode,
  total,
  customerName,
  storeName,
  shippingAddress,
  qrDataUrl,
}: OrderReceiptCardProps) {
  const referenceCode = orderReferenceCode(orderId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="overflow-hidden rounded-xl border border-neutral-200 shadow-sm dark:border-neutral-800"
    >
      <div className="flex items-center justify-between bg-neutral-900 px-5 py-3 text-white dark:bg-neutral-950">
        <span className="text-sm font-semibold">{storeName}</span>
        <span className="flex items-center gap-1.5 text-xs text-neutral-300">
          <ShieldCheck size={14} className="text-accent" />
          Compra protegida
        </span>
      </div>

      <div className="flex flex-col gap-6 bg-white p-5 dark:bg-neutral-950">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xl font-semibold tracking-wide text-accent">{referenceCode}</p>
            <p className="text-xs text-neutral-500">Codigo de referencia -- guardalo para consultar tu pedido</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">Orden #{orderNumber}</p>
            <p className="text-xs text-neutral-500">Realizado el {formatDate(createdAt)}</p>
          </div>
        </div>

        <div className="grid gap-4 border-t border-neutral-200 pt-4 sm:grid-cols-2 dark:border-neutral-800">
          <div>
            <p className="mb-1 text-xs font-medium tracking-wide text-neutral-400 uppercase">Comprador</p>
            <p className="text-sm">{customerName}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium tracking-wide text-neutral-400 uppercase">Pagaras</p>
            <p className="text-sm">{paymentMethodLabel}</p>
          </div>
        </div>

        <div className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium tracking-wide text-neutral-400 uppercase">
            <MapPin size={13} />
            Envio
          </p>
          {shippingAddress ? (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {shippingAddress.calle} {shippingAddress.numero}
              {shippingAddress.piso ? `, ${shippingAddress.piso}` : ""}, {shippingAddress.ciudad},{" "}
              {shippingAddress.departamento} (CP {shippingAddress.cp})
            </p>
          ) : (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">A coordinar / retiro en el local</p>
          )}
        </div>

        <div className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium tracking-wide text-neutral-400 uppercase">
            <Package size={13} />
            Articulos
          </p>
          <ul className="flex flex-col gap-2">
            {items.map((item, index) => (
              <li key={index} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <p>
                    {item.quantity}x {item.productName}
                    {item.variantLabel ? ` (${item.variantLabel})` : ""}
                  </p>
                  {item.variantSku && <p className="font-mono text-xs text-neutral-400">{item.variantSku}</p>}
                </div>
                <span className="shrink-0">{formatCurrency(Number(item.unitPrice) * item.quantity)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-1 border-t border-neutral-200 pt-4 text-sm dark:border-neutral-800">
          {Number(shippingCost) > 0 && (
            <div className="flex justify-between text-neutral-500">
              <span>Envio</span>
              <span>{formatCurrency(Number(shippingCost))}</span>
            </div>
          )}
          {Number(discountAmount) > 0 && (
            <div className="flex justify-between text-green-700 dark:text-green-400">
              <span>Descuento{couponCode ? ` (cupon ${couponCode})` : ""}</span>
              <span>-{formatCurrency(Number(discountAmount))}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-semibold dark:border-neutral-800">
            <span>Total</span>
            <span>{formatCurrency(Number(total))}</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 border-t border-neutral-200 pt-5 dark:border-neutral-800">
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL generado en el server, no aplica next/image */}
          <img src={qrDataUrl} alt="Codigo QR del comprobante" width={140} height={140} />
          <p className="text-center text-xs text-neutral-500">Escanealo para volver a este comprobante</p>
        </div>
      </div>
    </motion.div>
  );
}
