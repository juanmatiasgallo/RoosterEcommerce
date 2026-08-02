"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { UploadCloud, X } from "lucide-react";

// Aviso inmediato de "falta subir el comprobante", apenas se confirma un
// pedido con medio de pago manual (checkout de catalogo o pedido a medida,
// ver checkout-wizard.tsx y pedidos-client.tsx) -- pedido explicito del
// owner: antes de esto, el paso de subir el comprobante no quedaba claro,
// solo habia texto en la pagina. Distinto de ReceiptUploadedModal (que
// confirma DESPUES de subir): este avisa ANTES, apenas se aterriza en la
// pagina del comprobante.
//
// Se muestra solo la primera vez: ambos flujos redirigen aca con
// "?nuevo=1" en la URL; al cerrarse (por CTA o backdrop) el query param se
// limpia con router.replace, asi que un refresh o una vuelta mas tarde no
// lo vuelve a mostrar. Mismo criterio que awaitingReceiptUpload en
// OrderStatusTracker: solo aplica a medios de pago manuales elegibles para
// comprobante (ver isReceiptUploadEligible), nunca a Mercado Pago.
export function PendingReceiptModal({
  awaitingReceiptUpload,
  orderNumber,
}: {
  awaitingReceiptUpload: boolean;
  orderNumber: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (awaitingReceiptUpload && searchParams.get("nuevo") === "1") {
      setOpen(true);
    }
    // Solo nos importa el valor al montar/cuando cambia la URL -- no hace
    // falta reevaluar en cada render de awaitingReceiptUpload (no cambia
    // sin una navegacion de por medio en esta pagina).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function close() {
    setOpen(false);
    router.replace(pathname);
  }

  function handleUploadNow() {
    close();
    // El widget de subida vive en #comprobante-upload (ver receipt-upload.tsx
    // y OrderStatusTracker) -- reusar el mismo ancla en vez de duplicar logica
    // de scroll.
    requestAnimationFrame(() => {
      document.getElementById("comprobante-upload")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Falta subir el comprobante"
          onClick={close}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <motion.div
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-neutral-950 p-8 text-center text-white shadow-2xl"
          >
            <motion.div
              className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-accent/25 blur-3xl"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
            />

            <button
              type="button"
              onClick={close}
              aria-label="Cerrar"
              className="absolute right-3 top-3 text-neutral-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="relative flex flex-col items-center gap-3">
              <motion.span
                initial={{ scale: 0, rotate: 20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/20 text-accent"
              >
                <UploadCloud className="h-8 w-8" strokeWidth={1.75} />
              </motion.span>

              <h2 className="text-xl font-semibold">Ya casi — falta el comprobante</h2>
              <p className="text-sm text-neutral-400">
                Registramos tu orden #{orderNumber}. Para que podamos confirmar el pago y arrancar con tu pedido,
                subi el comprobante aca abajo.
              </p>

              <button
                type="button"
                onClick={handleUploadNow}
                className="mt-2 w-full rounded bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
              >
                Subir comprobante ahora
              </button>
              <button type="button" onClick={close} className="text-xs text-neutral-500 underline hover:text-neutral-300">
                Lo hago mas tarde
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
