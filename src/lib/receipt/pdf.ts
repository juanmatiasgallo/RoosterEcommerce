import QRCode from "qrcode";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatCurrency, formatDateFull } from "@/lib/format";
import { orderReferenceCode } from "@/lib/orders/reference-code";
import type { ShippingAddress } from "@/lib/orders/schema";

// Talon-comprobante en PDF con codigo QR — generado 100% en el server con
// librerias puramente JS (qrcode + pdf-lib), sin depender de ningun servicio
// externo pago (pedido explicito del owner: "gratis no quiero pagar por
// qr"). El QR apunta a la pagina web del comprobante (getReceiptUrl), asi
// que escanearlo abre /mi-cuenta/compras/[id] con los mismos datos.

export type ReceiptItem = {
  productName: string;
  variantLabel: string | null;
  variantSku: string | null;
  quantity: number;
  unitPrice: string;
};

export type ReceiptData = {
  orderNumber: number;
  createdAt: Date;
  status: string;
  statusLabel: string;
  paymentMethod: string;
  paymentMethodLabel: string;
  // "catalogo" | "pedido_custom" (ver orderSourceEnum en db/schema.ts) --
  // la pagina del comprobante lo usa solo para decidir a donde vuelve el
  // link "Volver" (/mi-cuenta/compras vs /mi-cuenta/pedidos), no cambia el
  // contenido del comprobante en si.
  source: string;
  items: ReceiptItem[];
  shippingCost: string;
  discountAmount: string;
  couponCode: string | null;
  total: string;
  customerName: string;
  storeName: string;
  shippingAddress: ShippingAddress | null;
  trackingCarrier: string | null;
  trackingCode: string | null;
};

export function getReceiptUrl(orderId: string): string {
  const base = process.env.AUTH_URL ?? "";
  return `${base}/mi-cuenta/compras/${orderId}`;
}

export async function generateReceiptQrDataUrl(orderId: string): Promise<string> {
  return QRCode.toDataURL(getReceiptUrl(orderId), { margin: 1, width: 240 });
}

export async function generateReceiptPdf(orderId: string, data: ReceiptData): Promise<Uint8Array> {
  const qrDataUrl = await generateReceiptQrDataUrl(orderId);
  const qrPngBytes = Buffer.from(qrDataUrl.split(",")[1], "base64");

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([420, 620]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const qrImage = await pdf.embedPng(qrPngBytes);

  const margin = 32;
  let y = 620 - margin;
  const { width } = page.getSize();

  // Helvetica/WinAnsi soporta letras con tilde/ñ (estan en el codepage
  // Windows-1252), pero no cualquier caracter Unicode (ej. emojis que
  // alguien pueda haber puesto en un nombre de producto) — si eso pasara,
  // pdf-lib tira una excepcion y se pierde todo el comprobante. Mejor
  // sanitizar a WinAnsi (reemplazar lo no soportado por "?") que romper la
  // generacion del PDF por un caracter suelto.
  function toWinAnsi(value: string): string {
    return value.replace(/[^\x00-\xFF]/g, "?");
  }

  function text(value: string, opts: { size?: number; bold?: boolean; color?: [number, number, number] } = {}) {
    const size = opts.size ?? 10;
    page.drawText(toWinAnsi(value), {
      x: margin,
      y,
      size,
      font: opts.bold ? fontBold : font,
      color: opts.color ? rgb(...opts.color) : rgb(0.1, 0.1, 0.1),
    });
    y -= size + 8;
  }

  text(data.storeName, { size: 16, bold: true });
  text(`Comprobante de compra - Orden #${data.orderNumber}`, { size: 12, bold: true });
  text(`Codigo de referencia: ${orderReferenceCode(orderId)}`, { size: 10, bold: true, color: [0.85, 0.34, 0.05] });
  y -= 4;
  text(`Fecha: ${formatDateFull(data.createdAt)}`);
  text(`Cliente: ${data.customerName}`);
  text(`Medio de pago: ${data.paymentMethodLabel}`);
  text(`Estado: ${data.statusLabel}`);
  if (data.trackingCarrier && data.trackingCode) {
    text(`Seguimiento (${data.trackingCarrier}): ${data.trackingCode}`, { size: 9, bold: true });
  }
  if (data.shippingAddress) {
    const a = data.shippingAddress;
    text(
      `Envio: ${a.calle} ${a.numero}${a.piso ? `, ${a.piso}` : ""}, ${a.ciudad}, ${a.departamento} (CP ${a.cp})`,
      { size: 9 },
    );
  }
  y -= 6;

  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
  y -= 16;

  text("Articulos", { size: 11, bold: true });
  for (const item of data.items) {
    const label = `${item.quantity}x ${item.productName}${item.variantLabel ? ` (${item.variantLabel})` : ""}`;
    text(label, { size: 9 });
    const lineTotal = Number(item.unitPrice) * item.quantity;
    page.drawText(toWinAnsi(formatCurrency(lineTotal)), {
      x: width - margin - 70,
      y: y + 17,
      size: 9,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
  }

  y -= 6;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
  y -= 16;

  if (Number(data.shippingCost) > 0) {
    text(`Envio: ${formatCurrency(Number(data.shippingCost))}`, { size: 9 });
  }
  if (Number(data.discountAmount) > 0) {
    text(
      `Descuento${data.couponCode ? ` (cupon ${data.couponCode})` : ""}: -${formatCurrency(Number(data.discountAmount))}`,
      { size: 9, color: [0, 0.4, 0] },
    );
  }
  text(`Total: ${formatCurrency(Number(data.total))}`, { size: 13, bold: true });

  y -= 10;
  const qrSize = 110;
  page.drawImage(qrImage, { x: (width - qrSize) / 2, y: y - qrSize, width: qrSize, height: qrSize });
  y -= qrSize + 14;
  page.drawText("Escaneala para ver el estado de tu pedido", {
    x: margin,
    y,
    size: 8,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  return pdf.save();
}
