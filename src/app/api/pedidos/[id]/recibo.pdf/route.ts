import { NextResponse } from "next/server";
import { getReceiptData } from "@/lib/receipt/actions";
import { generateReceiptPdf } from "@/lib/receipt/pdf";

// Descarga del comprobante en PDF (task #103). getReceiptData ya valida
// sesion + que la orden pertenezca al usuario logueado (mismo scoping que
// el resto de /mi-cuenta), asi que aca no hay chequeo de auth aparte: si no
// hay match, devuelve 404 en vez de filtrar que el id existe.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const receipt = await getReceiptData(id);
  if (!receipt) {
    return NextResponse.json({ error: "Comprobante no encontrado." }, { status: 404 });
  }

  const pdfBytes = await generateReceiptPdf(id, receipt);

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="recibo-orden-${receipt.orderNumber}.pdf"`,
    },
  });
}
