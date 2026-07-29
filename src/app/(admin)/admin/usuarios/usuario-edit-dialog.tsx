"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@base-ui/react/dialog";
import { toast } from "sonner";
import type { z } from "zod";
import { adminUpdateUserSchema } from "@/lib/users/schema";
import { adminUpdateUser } from "@/lib/users/actions";
import type { AdminUserListItem } from "@/lib/users/actions";

type FormValues = z.infer<typeof adminUpdateUserSchema>;

// Dialog de edicion (task #22): separado de UsuarioFormDialog (que es solo
// para altas de staff) porque edita un registro existente y expone menos
// campos a proposito -- no toca email/rol/contrasena, ver
// adminUpdateUserSchema.
export function UsuarioEditDialog({ user, onClose }: { user: AdminUserListItem; onClose: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(adminUpdateUserSchema),
    defaultValues: { name: user.name, phone: user.phone ?? "" },
  });

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      await adminUpdateUser(user.id, values);
      toast.success("Datos actualizados.");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el usuario.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/40" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-neutral-200 bg-white p-6 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          <Dialog.Title className="text-lg font-semibold">Editar {user.name}</Dialog.Title>
          <p className="mt-1 text-xs text-neutral-500">{user.email}</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-4">
            <div>
              <label htmlFor="edit-user-name" className="mb-1 block text-sm font-medium">
                Nombre
              </label>
              <input
                id="edit-user-name"
                {...register("name")}
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>

            <div>
              <label htmlFor="edit-user-phone" className="mb-1 block text-sm font-medium">
                Telefono
              </label>
              <input
                id="edit-user-phone"
                {...register("phone")}
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
            </div>

            <div className="mt-2 flex justify-end gap-2">
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
                {isSubmitting ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
