"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { CheckCircle2, FileText, Upload } from "lucide-react";
import { uploadPaymentReceipt } from "@/lib/orders/actions";
import { Spinner } from "@/components/ui/spinner";
import { ReceiptUploadedModal } from "@/components/receipt-uploaded-modal";

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
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

function extensionOf(url: string): string {
  return url.split(".").pop()?.toLowerCase() ?? "";
}

export function ReceiptUpload({
  orderId,
  initialReceiptUrl,
}: {
  orderId: string;
  // Bug reportado: antes este componente arrancaba siempre en blanco (solo
  // useState local), asi que un refresh de la pagina "perdia" el
  // comprobante aunque ya estuviera guardado en la orden (orders.receiptUrl,
  // ver uploadPaymentReceipt). Ahora el Server Component de la pagina trae
  // el valor persistido y lo pasa aca como estado inicial -- ver
  // getReceiptData en lib/receipt/actions.ts.
  initialReceiptUrl?: string | null;
}) {
  const [receiptUrl, setReceiptUrl] = useState<string | null>(initialReceiptUrl ?? null);
  const [showUploadForm, setShowUploadForm] = useState(!initialReceiptUrl);
  const [showModal, setShowModal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
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
      const result = await uploadPaymentReceipt(orderId, file);
      setReceiptUrl(result.receiptUrl);
      setShowUploadForm(false);
      setFile(null);
      setShowModal(true);
      toast.success("Comprobante enviado correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir el comprobante.");
    } finally {
      setIsUploading(false);
    }
  }

  // Vista persistente (pedido explicito: "quede previsualizador para que a
  // simple vista pueda verlo"): thumbnail si es imagen, icono + link si es
  // PDF. Se muestra siempre que haya un receiptUrl -- recien subido o
  // traido de la orden al cargar la pagina -- asi que sobrevive a un
  // refresh sin distincion.
  if (receiptUrl && !showUploadForm) {
    const isImage = IMAGE_EXTENSIONS.includes(extensionOf(receiptUrl));

    return (
      <>
        <div className="flex items-center gap-3 rounded-lg border border-green-300 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/40">
          <a
            href={receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center justify-center overflow-hidden rounded border border-green-300 bg-white dark:border-green-800 dark:bg-neutral-900"
          >
            {isImage ? (
              <Image
                src={receiptUrl}
                alt="Comprobante subido"
                width={56}
                height={56}
                className="h-14 w-14 object-cover"
                unoptimized
              />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center text-green-700 dark:text-green-400">
                <FileText size={24} />
              </span>
            )}
          </a>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-medium text-green-800 dark:text-green-300">
              <CheckCircle2 size={15} className="shrink-0" />
              Comprobante subido
            </p>
            <a
              href={receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-green-700/80 underline dark:text-green-400/80"
            >
              Ver comprobante
            </a>
          </div>
          <button
            type="button"
            onClick={() => setShowUploadForm(true)}
            className="shrink-0 self-start text-xs text-neutral-500 underline hover:text-accent"
          >
            Subir otro
          </button>
        </div>

        <ReceiptUploadedModal open={showModal} onClose={() => setShowModal(false)} />
      </>
    );
  }

  // Caja mas llamativa (pedido explicito): antes era un borde gris plano
  // facil de pasar por alto -- ahora usa el acento de marca (borde
  // punteado + fondo tintado + icono) para que salte a la vista como una
  // accion disponible, no solo un detalle mas de la pantalla.
  return (
    <>
      <div className="flex flex-col gap-3 rounded-lg border-2 border-dashed border-accent/40 bg-accent/[0.06] p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Upload className="text-accent" size={17} strokeWidth={2} />
            <p className="text-sm font-semibold">
              {receiptUrl ? "Subir otro comprobante" : "Ya tenes el comprobante? Subilo aca"}
            </p>
          </div>
          {receiptUrl && (
            <button
              type="button"
              onClick={() => {
                setShowUploadForm(false);
                setError(null);
                setFile(null);
              }}
              className="shrink-0 text-xs text-neutral-500 underline hover:text-accent"
            >
              Cancelar
            </button>
          )}
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

      <ReceiptUploadedModal open={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
