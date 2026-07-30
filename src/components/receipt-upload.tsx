"use client";

import { useState } from "react";
import { toast } from "sonner";
import { uploadPaymentReceipt } from "@/lib/orders/actions";
import { Spinner } from "@/components/ui/spinner";

// Extraido de checkout-wizard.tsx: antes solo vivia en la pantalla inline de
// "Orden de servicio creada" del checkout. Ahora que ese flujo redirige al
// comprobante real (/mi-cuenta/compras/[id], ver ese page.tsx), este mismo
// widget se muestra ahi -- componente compartido en vez de duplicado, misma
// logica de subida (uploadPaymentReceipt ya valida dueno/estado/medio de
// pago del lado del server, no hace falta repetir esa validacion aca).
//
// Opcional: el cliente puede subir el comprobante ahora mismo (si ya tiene
// la transferencia hecha) o mas adelante — no bloquea nada, es solo una
// ayuda para que el admin confirme el pago mas rapido.
//
// Limite real (extensiones + tamano) se valida en el server
// (uploadPaymentReceipt, UPLOADS_MAX_SIZE_MB=20 por default) -- esta
// constante es solo para el mensaje de error inmediato en el cliente, sin
// esperar el roundtrip al server.
const MAX_SIZE_MB = 20;

export function ReceiptUpload({ orderId }: { orderId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(selected: File | null) {
    setError(null);
    if (selected && selected.size > MAX_SIZE_MB * 1024 * 1024) {
      setFile(null);
      setError(`El archivo supera el tamano maximo permitido (${MAX_SIZE_MB} MB).`);
      return;
    }
    setFile(selected);
  }

  async function handleUpload() {
    if (!file) return;
    setError(null);
    setIsUploading(true);
    try {
      await uploadPaymentReceipt(orderId, file);
      setUploaded(true);
      toast.success("Comprobante subido.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir el comprobante.");
    } finally {
      setIsUploading(false);
    }
  }

  if (uploaded) {
    return <p className="text-sm text-green-700 dark:text-green-400">Comprobante subido, gracias.</p>;
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-neutral-200 p-3 dark:border-neutral-800">
      <p className="text-sm font-medium">Ya tenes el comprobante? Subilo aca (opcional)</p>
      <p className="text-xs text-neutral-500">PDF, JPG, PNG o WEBP — hasta {MAX_SIZE_MB} MB.</p>
      <input
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf"
        onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
        className="text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={handleUpload}
        disabled={!file || isUploading}
        className="flex items-center justify-center gap-2 self-start rounded border border-neutral-300 px-3 py-1.5 text-sm active:scale-[0.98] disabled:opacity-50 dark:border-neutral-700"
      >
        {isUploading && <Spinner size={14} />}
        {isUploading ? "Subiendo..." : "Subir comprobante"}
      </button>
    </div>
  );
}
