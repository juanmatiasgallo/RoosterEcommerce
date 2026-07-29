"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Gift, PartyPopper, Sparkles, X } from "lucide-react";

// Modal de agradecimiento al suscribirse al newsletter (task #117): convive
// con el toast rapido que ya existia (NewsletterForm sigue mostrandolo),
// esto es la "ceremonia" mas grande -- primera vez que se usa Framer
// Motion en el sitio (el resto de las animaciones son Tailwind/tw-animate-css,
// pero el owner pidio explicitamente esta libreria para elevar momentos como
// este).
export function NewsletterThanksModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Gracias por suscribirte"
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
              className="pointer-events-none absolute -top-10 -left-10 h-40 w-40 rounded-full bg-accent/25 blur-3xl"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <motion.div
              className="pointer-events-none absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-accent/20 blur-3xl"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, delay: 1 }}
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
                className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/20 text-accent"
              >
                <PartyPopper className="h-8 w-8" strokeWidth={1.75} />
              </motion.span>

              <div className="flex items-center gap-1 text-accent">
                <Sparkles size={14} />
                <span className="text-xs font-medium tracking-wide uppercase">Gracias por sumarte</span>
                <Sparkles size={14} />
              </div>

              <h2 className="text-xl font-semibold">Gracias por confiar en nuestros productos</h2>
              <p className="text-sm text-neutral-400">
                Te vamos a avisar de las proximas ofertas y novedades del catalogo. Nada de spam, prometido.
              </p>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mt-2 flex w-full items-start gap-3 rounded-lg bg-white/5 p-4 text-left"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent">
                  <Gift size={16} />
                </span>
                <p className="text-sm text-neutral-300">
                  <span className="font-medium text-white">Bonus:</span> si te creas una cuenta, sumas puntos en cada
                  compra que despues podes canjear por descuentos y ofertas exclusivas.
                </p>
              </motion.div>

              <div className="mt-4 flex w-full flex-col gap-2">
                <Link
                  href="/crear-cuenta"
                  onClick={onClose}
                  className="rounded bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
                >
                  Crear cuenta y sumar puntos
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded border border-white/20 px-4 py-2.5 text-sm text-white hover:bg-white/10"
                >
                  Seguir mirando
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
