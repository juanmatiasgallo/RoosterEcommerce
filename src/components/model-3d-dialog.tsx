"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { Model3DViewer, type Model3DExtension } from "./model-3d-viewer";

// Modal compartido para el visor 3D (task #148): lo usan pedido-a-medida-wizard.tsx
// (preview del archivo antes de enviarlo), mi-cuenta/pedidos (el cliente
// vuelve a verlo despues) y admin/pedidos-custom (el staff lo inspecciona
// antes de cotizar) -- un solo lugar para el layout del dialog en vez de
// repetirlo en los tres.
export function Model3DDialog({
  open,
  onClose,
  url,
  extension,
  title,
}: {
  open: boolean;
  onClose: () => void;
  url: string;
  extension: Model3DExtension;
  title: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex h-[80vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
            <Dialog.Title className="truncate text-sm font-medium">{title}</Dialog.Title>
            <Dialog.Close
              aria-label="Cerrar"
              className="rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <X size={16} />
            </Dialog.Close>
          </div>

          <div className="flex-1 bg-neutral-100 dark:bg-neutral-950">
            {open && <Model3DViewer url={url} extension={extension} />}
          </div>

          <p className="border-t border-neutral-200 px-4 py-2 text-center text-xs text-neutral-400 dark:border-neutral-800">
            Arrastra para rotar · scroll o pellizca para hacer zoom
          </p>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
