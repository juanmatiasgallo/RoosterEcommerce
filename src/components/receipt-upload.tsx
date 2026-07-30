"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Upload } from "lucide-react";
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
      toast.success("Comprobante enviado correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir el comprobante.");
    } finally {
      setIsUploading(false);
    }
  }

  // Confirmacion persistente (pedido explicito): antes desaparecia la caja
  // entera y quedaba solo una linea de texto chica -- facil de perderse
  // scrolleando. Ahora queda un banner en el mismo lugar, con animacion de
  // entrada (fade+zoom) ademas del toast, para que quede claro y visible que
  // el archivo llego bien.
  if (uploaded) {
    return (
      <div className="animate-in fade-in zoom-in-95 flex items-start gap-3 rounded-lg border border-green-300 bg-green-50 p-4 duration-300 dark:border-green-800 dark:bg-green-950/40">
        <CheckCircle2 className="mt-0.5 shrink-0 text-green-600 dark:text-green-400" size={20} />
        <div>
          <p className="text-sm font-medium text-green-800 dark:text-green-300">Comprobante enviado correctamente</p>
          <p className="mt-0.5 text-xs text-green-700/80 dark:text-green-400/80">
            Ya le avisamos al equipo. En cuanto lo verifiquen, te confirmamos el pedido.
          </p>
        </div>
      </div>
    );
  }

  // Caja mas llamativa (pedido explicito): antes era un borde gris plano
  // facil de pasar por alto -- ahora usa el acento de marca (borde
  // punteado + fondo tintado + icono) para que salte a la vista como una
  // accion disponible, no solo un detalle mas de la pantalla.
  return (
    <div className="flex flex-col gap-3 rounded-lg border-2 border-dashed border-accent/40 bg-accent/[0.06] p-4">
      <div className="flex items-center gap-2">
        <Upload className="text-accent" size={17} strokeWidth={2} />
        <p className="text-sm font-semibold">Ya tenes el comprobante? Subilo aca</p>
      </div>
      <p className="text-xs text-neutral-500">
        PDF, JPG, PNG o WEBP — hasta {MAX_SIZE_MB} MB. Opcional, pero acelera la confirmacion del pago.
      </p>
      <input
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf"
        onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
        className="text-sm file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent-foreground hover:file:bg-accent-hover"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={handleUpload}
        disabled={!file || isUploading}
        className="flex items-center justify-center gap-2 self-start rounded bg-accent px-4 py-2 text-sm font-medium text-accent-foreground active:scale-[0.98] disabled:opacity-50 hover:bg-accent-hover"
      >
        {isUploading && <Spinner size={14} />}
        {isUploading ? "Subiendo..." : "Subir comprobante"}
      </button>
    </div>
  );
}
