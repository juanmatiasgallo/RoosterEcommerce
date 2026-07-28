"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@base-ui/react/dialog";
import { toast } from "sonner";
import type { z } from "zod";
import { quoteCustomOrderSchema } from "@/lib/custom-orders/schema";
import { quoteCustomOrder, type CustomOrderRow } from "@/lib/custom-orders/actions";

type FormValues = z.infer<typeof quoteCustomOrderSchema>;

export function CotizarFormDialog({ order, onClose }: { order: CustomOrderRow; onClose: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(quoteCustomOrderSchema),
    defaultValues: { quotedNotes: "" },
  });

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      const result = await quoteCustomOrder(order.id, values);
      if (result.emailSent) {
        toast.success("Cotizacion guardada y mail enviado al cliente.");
      } else {
        // La cotizacion SI se guardo (result no tiro excepcion) — se aclara
        // que el mail fallo en vez de un "listo" generico que lo esconda.
        toast.warning("Cotizacion guardada, pero no se pudo notificar por mail al cliente — revisa la config SMTP.");
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cotizar el pedido.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/40" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-neutral-200 bg-white p-6 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          <Dialog.Title className="text-lg font-semibold">Cotizar: {order.fileName}</Dialog.Title>

          <p className="mt-1 text-sm text-neutral-500">
            {[order.material, order.color, order.approxSize].filter(Boolean).join(" · ") || "Sin specs adicionales"}{" "}
            · Cantidad: {order.quantity}
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-4">
            <div>
              <label htmlFor="quotedPrice" className="mb-1 block text-sm font-medium">
                Precio
              </label>
              <input
                id="quotedPrice"
                type="number"
                step="0.01"
                min={0}
                {...register("quotedPrice", { valueAsNumber: true })}
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              {errors.quotedPrice && <p className="mt-1 text-xs text-red-600">{errors.quotedPrice.message}</p>}
            </div>

            <div>
              <label htmlFor="quotedNotes" className="mb-1 block text-sm font-medium">
                Notas de la cotizacion (opcional)
              </label>
              <textarea
                id="quotedNotes"
                rows={3}
                {...register("quotedNotes")}
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Dialog.Close
                type="button"
                className="rounded px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                Cancelar
              </Dialog.Close>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
              >
                {isSubmitting ? "Enviando..." : "Enviar cotizacion"}
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
