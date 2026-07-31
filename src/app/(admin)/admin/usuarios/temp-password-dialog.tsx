"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Check, Copy } from "lucide-react";

// Reemplaza el window.alert() original (pedido explicito: "no me diste
// oportunidad de copiar" -- el texto de un alert nativo no siempre es
// facil de seleccionar, sobre todo pensando que el admin va a usar esta
// contrasena para probar cosas con esa cuenta, no solo para leerla).
export function TempPasswordDialog({
  userName,
  userEmail,
  tempPassword,
  onClose,
}: {
  userName: string;
  userEmail: string;
  tempPassword: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // No-op: si el navegador bloquea el clipboard (sin HTTPS o permiso
      // denegado), el texto sigue visible y seleccionable a mano (select-all
      // en el <code> de abajo).
    }
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-neutral-200 bg-white p-6 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          <Dialog.Title className="text-lg font-semibold">Contrasena reseteada</Dialog.Title>
          <p className="mt-1 text-xs text-neutral-500">
            {userName} ({userEmail}) — valida por 24 horas. Se le va a pedir que la cambie en el proximo login.
          </p>

          <div className="mt-4 flex items-center gap-2 rounded border border-neutral-300 bg-neutral-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900">
            <code className="flex-1 min-w-0 truncate font-mono text-sm select-all">{tempPassword}</code>
            <button
              type="button"
              onClick={handleCopy}
              className="flex shrink-0 items-center gap-1.5 rounded bg-neutral-900 px-2.5 py-1.5 text-xs font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>

          <p className="mt-3 text-xs text-neutral-500">
            Tambien se le mando por mail a {userEmail}. Copiala ahora si la vas a necesitar — no queda guardada en
            ningun lado, no se puede volver a ver despues de cerrar esta ventana.
          </p>

          <div className="mt-4 flex justify-end">
            <Dialog.Close
              type="button"
              className="rounded bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
            >
              Listo
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
