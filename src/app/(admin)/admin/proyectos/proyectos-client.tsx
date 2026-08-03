"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Pencil, Star } from "lucide-react";
import { toast } from "sonner";
import { reorderProjects, setProjectActive, type AdminProjectListItem } from "@/lib/projects/actions";
import { getProjectThemeIcon, getProjectThemeLabel } from "@/lib/projects/theme-registry";
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { ProyectoFormDialog } from "./proyecto-form-dialog";

type DialogState = { mode: "create" } | { mode: "edit"; project: AdminProjectListItem } | null;

export function ProyectosClient({ items }: { items: AdminProjectListItem[] }) {
  const [isPending, startTransition] = useTransition();
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const { page, setPage, totalPages, pageItems } = usePagination(items);

  function move(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const current = items[index];
    const target = items[targetIndex];

    startTransition(async () => {
      try {
        await reorderProjects([
          { id: current.id, position: target.position },
          { id: target.id, position: current.position },
        ]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo reordenar.");
      }
    });
  }

  function handleToggleActive(project: AdminProjectListItem) {
    setPendingId(project.id);
    startTransition(async () => {
      try {
        await setProjectActive(project.id, !project.active);
        toast.success(project.active ? "Proyecto desactivado." : "Proyecto reactivado.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo actualizar el estado.");
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Proyectos</h1>
          <p className="text-sm text-neutral-500">Galeria de trabajos impresos que se muestra en /proyectos.</p>
        </div>
        <button
          type="button"
          onClick={() => setDialogState({ mode: "create" })}
          className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium whitespace-nowrap text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          Nuevo proyecto
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">Todavia no hay proyectos cargados.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pageItems.map((project) => {
            // Indice en la lista completa (no en la pagina visible): las
            // flechas de reordenar swapean posiciones adyacentes en el
            // orden real, que puede caer en otra pagina.
            const index = items.findIndex((item) => item.id === project.id);
            const ThemeIcon = getProjectThemeIcon(project.theme);
            const themeLabel = getProjectThemeLabel(project.theme);

            return (
            <div
              key={project.id}
              className="flex flex-col overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800"
            >
              <div className="relative aspect-video bg-neutral-100 dark:bg-neutral-900">
                <Image src={project.imageUrl} alt={project.title} fill className="object-cover" sizes="320px" />
                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                  {project.featured && (
                    <span className="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                      <Star size={11} fill="currentColor" /> Destacado
                    </span>
                  )}
                  {!project.active && (
                    <span className="rounded-full bg-neutral-900/80 px-2 py-0.5 text-xs font-medium text-white">
                      Inactivo
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium">{project.title}</p>
                  {themeLabel && (
                    <span className="flex items-center gap-1 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-500 dark:bg-neutral-800">
                      <ThemeIcon size={11} /> {themeLabel}
                    </span>
                  )}
                </div>
                {project.description && (
                  <p className="line-clamp-2 text-xs text-neutral-500">{project.description}</p>
                )}
                <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0 || isPending}
                      aria-label="Mover antes"
                      className="rounded p-1 text-neutral-500 hover:bg-neutral-200 disabled:opacity-30 dark:hover:bg-neutral-700"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === items.length - 1 || isPending}
                      aria-label="Mover despues"
                      className="rounded p-1 text-neutral-500 hover:bg-neutral-200 disabled:opacity-30 dark:hover:bg-neutral-700"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => setDialogState({ mode: "edit", project })}
                      className="flex items-center gap-1 text-accent hover:underline"
                    >
                      <Pencil size={12} />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(project)}
                      disabled={isPending && pendingId === project.id}
                      className="text-neutral-500 hover:underline disabled:opacity-50 dark:text-neutral-400"
                    >
                      {isPending && pendingId === project.id
                        ? "..."
                        : project.active
                          ? "Desactivar"
                          : "Reactivar"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {dialogState?.mode === "create" && <ProyectoFormDialog mode="create" onClose={() => setDialogState(null)} />}
      {dialogState?.mode === "edit" && (
        <ProyectoFormDialog
          key={dialogState.project.id}
          mode="edit"
          project={dialogState.project}
          onClose={() => setDialogState(null)}
        />
      )}
    </div>
  );
}
