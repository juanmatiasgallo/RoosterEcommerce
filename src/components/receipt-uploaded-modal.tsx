"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";

// Modal de confirmacion al subir el comprobante de pago (pedido explicito:
// antes de esto solo habia un toast + un banner inline, que segun el owner
// pasaban desapercibidos). Mismo lenguaje visual que
// newsletter-thanks-modal.tsx (Framer Motion, fondo oscuro con blobs de
// acento) para no inventar un segundo estilo de modal en el sitio, pero
// mucho mas chico/rapido -- esto es una confirmacion, no una "ceremonia" con
// CTAs.
export function ReceiptUploadedModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Comprobante adjuntado"
          onClick={onClose}
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
              className="pointer-events-none absolute -top-10 -left-10 h-40 w-40 rounded-full bg-green-500/20 blur-3xl"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
            />

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="absolute right-3 top-3 text-neutral-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="relative flex flex-col items-center gap-3">
              <motion.span
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-green-400"
              >
                <CheckCircle2 className="h-8 w-8" strokeWidth={1.75} />
              </motion.span>

              <h2 className="text-xl font-semibold">Comprobante adjuntado</h2>
              <p className="text-sm text-neutral-400">
                Ya le avisamos al equipo. En cuanto lo verifiquen, te confirmamos el pedido por mail.
              </p>

              <button
                type="button"
                onClick={onClose}
                className="mt-2 w-full rounded bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
              >
                Listo
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
