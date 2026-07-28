"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@base-ui/react/dialog";
import { Select } from "@base-ui/react/select";
import { ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import { createCategorySchema } from "@/lib/catalog/schema";
import { createCategory, updateCategory } from "@/lib/catalog/actions";
import type { CategoryTreeNode } from "@/lib/catalog/queries";

type FormValues = z.infer<typeof createCategorySchema>;

type Props =
  | {
      mode: "create";
      defaultParentId?: string | null;
      category?: undefined;
      allCategories: CategoryTreeNode[];
      onClose: () => void;
    }
  | {
      mode: "edit";
      category: CategoryTreeNode;
      defaultParentId?: undefined;
      allCategories: CategoryTreeNode[];
      onClose: () => void;
    };

// Al editar, la categoria no puede pasar a ser su propia subcategoria: se
// excluyen ella misma y todos sus descendientes de las opciones de padre.
// (actions.ts solo chequea el caso directo id === parentId; este filtro de UI
// cubre el resto para que nunca se pueda armar un ciclo desde el formulario.)
function collectDescendantIds(node: CategoryTreeNode): string[] {
  return node.children.flatMap((child) => [child.id, ...collectDescendantIds(child)]);
}

export function CategoriaFormDialog(props: Props) {
  const { allCategories, onClose, mode } = props;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const excludedIds =
    mode === "edit" ? new Set([props.category.id, ...collectDescendantIds(props.category)]) : new Set<string>();
  const parentOptions = allCategories.filter((category) => !excludedIds.has(category.id));

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: mode === "edit" ? props.category.name : "",
      slug: mode === "edit" ? props.category.slug : "",
      parentId: mode === "edit" ? (props.category.parentId ?? undefined) : (props.defaultParentId ?? undefined),
    },
  });

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      if (mode === "edit") {
        await updateCategory(props.category.id, values);
        toast.success("Categoria actualizada.");
      } else {
        await createCategory(values);
        toast.success("Categoria creada.");
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la categoria.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/40" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-neutral-200 bg-white p-6 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          <Dialog.Title className="text-lg font-semibold">
            {mode === "edit" ? "Editar categoria" : "Nueva categoria"}
          </Dialog.Title>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-4">
            <div>
              <label htmlFor="category-name" className="mb-1 block text-sm font-medium">
                Nombre
              </label>
              <input
                id="category-name"
                {...register("name")}
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>

            <div>
              <label htmlFor="category-slug" className="mb-1 block text-sm font-medium">
                Slug
              </label>
              <input
                id="category-slug"
                {...register("slug")}
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              {errors.slug && <p className="mt-1 text-xs text-red-600">{errors.slug.message}</p>}
            </div>

            <div>
              <span className="mb-1 block text-sm font-medium">Categoria padre</span>
              {/* Select de Base UI: se registra con Controller (no con
                  register directo), tal como pide CLAUDE.md. */}
              <Controller
                name="parentId"
                control={control}
                render={({ field }) => (
                  <Select.Root
                    value={field.value ?? null}
                    onValueChange={(value) => field.onChange(value ?? undefined)}
                  >
                    <Select.Trigger className="flex w-full items-center justify-between rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900">
                      <Select.Value placeholder="Sin categoria padre (raiz)" />
                      <Select.Icon>
                        <ChevronsUpDown size={14} className="text-neutral-500" />
                      </Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Positioner sideOffset={4} className="z-50">
                        <Select.Popup className="max-h-64 overflow-y-auto rounded border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                          <Select.List>
                            <Select.Item
                              value={null}
                              className="cursor-pointer px-3 py-1.5 text-sm data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-800"
                            >
                              <Select.ItemText>Sin categoria padre (raiz)</Select.ItemText>
                            </Select.Item>
                            {parentOptions.map((option) => (
                              <Select.Item
                                key={option.id}
                                value={option.id}
                                className="cursor-pointer px-3 py-1.5 text-sm data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-800"
                              >
                                <Select.ItemText>{option.name}</Select.ItemText>
                              </Select.Item>
                            ))}
                          </Select.List>
                        </Select.Popup>
                      </Select.Positioner>
                    </Select.Portal>
                  </Select.Root>
                )}
              />
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
