import type { ManualPaymentMethod } from "./actions";

// Los medios que involucran plata que el cliente ya mando (no contra
// entrega) son los unicos donde tiene sentido pedir/subir un comprobante.
// Separado de actions.ts (que es "use server", solo puede exportar
// funciones async) para poder reusar esta lista/logica pura tanto en la
// validacion del server action (uploadPaymentReceipt) como en la pagina del
// comprobante (/mi-cuenta/compras/[id], un Server Component que decide si
// mostrar el widget de subida sin pasar por una Server Action para algo tan
// simple como esto).
export const RECEIPT_ELIGIBLE_METHODS: ManualPaymentMethod[] = ["transferencia", "abitab", "redpagos", "mi_dinero", "prex"];

// Misma condicion que valida uploadPaymentReceipt del lado del server: solo
// tiene sentido ofrecer subir comprobante mientras la orden sigue esperando
// que un admin confirme el pago manualmente.
export function isReceiptUploadEligible(paymentMethod: string, status: string): boolean {
  return status === "pendiente_confirmacion" && RECEIPT_ELIGIBLE_METHODS.includes(paymentMethod as ManualPaymentMethod);
}
