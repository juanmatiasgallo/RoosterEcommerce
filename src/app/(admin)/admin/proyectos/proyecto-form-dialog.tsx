"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@base-ui/react/dialog";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import { createProjectSchema } from "@/lib/projects/schema";
import { createProject, replaceProjectImage, updateProject, type AdminProjectListItem } from "@/lib/projects/actions";
import { PROJECT_THEMES, PROJECT_THEME_KEYS } from "@/lib/projects/theme-registry";

type FormValues = z.infer<typeof createProjectSchema>;

type Props = { mode: "create" } | { mode: "edit"; project: AdminProjectListItem };

export function ProyectoFormDialog(props: Props & { onClose: () => void }) {
  const { onClose } = props;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues:
      props.mode === "edit"
        ? {
            title: props.project.title,
            description: props.project.description ?? "",
            theme: (props.project.theme ?? "") as FormValues["theme"],
            featured: props.project.featured,
          }
        : { title: "", description: "", theme: "", featured: false },
  });

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      if (props.mode === "create") {
        if (!file) {
          toast.error("Elegi una foto para el proyecto.");
          setIsSubmitting(false);
          return;
        }
        await createProject(values, file);
        toast.success("Proyecto creado.");
      } else {
        await updateProject(props.project.id, values);
        if (file) {
          await replaceProjectImage(props.project.id, file);
        }
        toast.success("Proyecto actualizado.");
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el proyecto.");
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
            {props.mode === "create" ? "Nuevo proyecto" : `Editar ${props.project.title}`}
          </Dialog.Title>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-4">
            <div>
              <label htmlFor="project-title" className="mb-1 block text-sm font-medium">
                Titulo
              </label>
              <input
                id="project-title"
                {...register("title")}
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
            </div>

            <div>
              <label htmlFor="project-description" className="mb-1 block text-sm font-medium">
                Descripcion
              </label>
              <p className="mb-1.5 text-xs text-neutral-500">
                Soporta Markdown: ## Titulo, **negrita**, listas con guion. Se muestra formateado en el detalle del
                proyecto.
              </p>
              <textarea
                id="project-description"
                rows={5}
                {...register("description")}
                className="w-full rounded border border-neutral-300 px-3 py-2 font-mono text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
            </div>

            <div>
              <label htmlFor="project-theme" className="mb-1 block text-sm font-medium">
                Tematica (opcional)
              </label>
              <select
                id="project-theme"
                {...register("theme")}
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              >
                <option value="">Sin tematica</option>
                {PROJECT_THEME_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {PROJECT_THEMES[key].label}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register("featured")} className="h-4 w-4 rounded border-neutral-300" />
              Destacado (aparece en el carousel de arriba de /proyectos)
            </label>

            <div>
              <span className="mb-1 block text-sm font-medium">
                Foto {props.mode === "edit" && <span className="font-normal text-neutral-400">(opcional, reemplaza la actual)</span>}
              </span>
              <label className="flex cursor-pointer items-center gap-1.5 rounded border border-dashed border-neutral-300 px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
                <Upload size={14} />
                {file ? file.name : "Elegir imagen"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </label>
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
