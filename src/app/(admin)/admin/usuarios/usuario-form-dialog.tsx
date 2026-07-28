"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@base-ui/react/dialog";
import { Select } from "@base-ui/react/select";
import { ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import { adminCreateUserSchema } from "@/lib/users/schema";
import { adminCreateUser } from "@/lib/users/actions";

type FormValues = z.infer<typeof adminCreateUserSchema>;

const ROLE_OPTIONS = [
  { value: "empleado", label: "Empleado" },
  { value: "admin", label: "Admin" },
] as const;

export function UsuarioFormDialog({ onClose }: { onClose: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(adminCreateUserSchema),
    defaultValues: { role: "empleado" },
  });

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      await adminCreateUser(values);
      toast.success("Usuario creado.");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el usuario.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/40" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-neutral-200 bg-white p-6 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          <Dialog.Title className="text-lg font-semibold">Nuevo usuario</Dialog.Title>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-4">
            <div>
              <label htmlFor="user-name" className="mb-1 block text-sm font-medium">
                Nombre
              </label>
              <input
                id="user-name"
                {...register("name")}
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>

            <div>
              <label htmlFor="user-email" className="mb-1 block text-sm font-medium">
                Email
              </label>
              <input
                id="user-email"
                type="email"
                autoComplete="email"
                {...register("email")}
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="user-password" className="mb-1 block text-sm font-medium">
                Contrasena
              </label>
              <input
                id="user-password"
                type="password"
                autoComplete="new-password"
                {...register("password")}
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <div>
              <label htmlFor="user-confirm-password" className="mb-1 block text-sm font-medium">
                Repetir contrasena
              </label>
              <input
                id="user-confirm-password"
                type="password"
                autoComplete="new-password"
                {...register("confirmPassword")}
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div>
              <span className="mb-1 block text-sm font-medium">Rol</span>
              {/* Select de Base UI: se registra con Controller (no con
                  register directo), tal como pide CLAUDE.md. */}
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select.Root value={field.value} onValueChange={(value) => field.onChange(value)}>
                    <Select.Trigger className="flex w-full items-center justify-between rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900">
                      <Select.Value />
                      <Select.Icon>
                        <ChevronsUpDown size={14} className="text-neutral-500" />
                      </Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Positioner sideOffset={4} className="z-50">
                        <Select.Popup className="rounded border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                          <Select.List>
                            {ROLE_OPTIONS.map((option) => (
                              <Select.Item
                                key={option.value}
                                value={option.value}
                                className="cursor-pointer px-3 py-1.5 text-sm data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-800"
                              >
                                <Select.ItemText>{option.label}</Select.ItemText>
                              </Select.Item>
                            ))}
                          </Select.List>
                        </Select.Popup>
                      </Select.Positioner>
                    </Select.Portal>
                  </Select.Root>
                )}
              />
              {errors.role && <p className="mt-1 text-xs text-red-600">{errors.role.message}</p>}
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
                {isSubmitting ? "Creando..." : "Crear"}
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
