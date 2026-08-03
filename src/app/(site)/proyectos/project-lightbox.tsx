"use client";

import Image from "next/image";
import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import type { PublicProject } from "@/lib/projects/queries";
import { getProjectThemeIcon, getProjectThemeLabel } from "@/lib/projects/theme-registry";
import { MarkdownContent } from "@/components/markdown-content";

// Detalle ampliado de un proyecto (task #147): antes la unica forma de ver
// una pieza era la card chica de la grilla, con la descripcion truncada a
// dos lineas y sin ningun tipo de estructura. Aca se ve la foto grande y la
// descripcion completa renderizada como Markdown (con sus h2/h3 si el admin
// los escribio).
export function ProjectLightbox({ project, onClose }: { project: PublicProject | null; onClose: () => void }) {
  const ThemeIcon = project ? getProjectThemeIcon(project.theme) : null;
  const themeLabel = project ? getProjectThemeLabel(project.theme) : null;

  return (
    <Dialog.Root open={project !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        {project && (
          <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex max-h-[90vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 dark:border-neutral-800 dark:bg-neutral-900">
            <Dialog.Close
              aria-label="Cerrar"
              className="absolute top-3 right-3 z-10 rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
            >
              <X size={16} />
            </Dialog.Close>

            <div className="relative aspect-video w-full shrink-0 bg-neutral-100 dark:bg-neutral-950">
              <Image src={project.imageUrl} alt={project.title} fill className="object-cover" sizes="700px" />
            </div>

            <div className="overflow-y-auto p-5 sm:p-6">
              {themeLabel && ThemeIcon && (
                <span className="mb-2 flex w-fit items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                  <ThemeIcon size={13} /> {themeLabel}
                </span>
              )}
              <Dialog.Title className="text-xl font-semibold sm:text-2xl">{project.title}</Dialog.Title>
              {project.description && <MarkdownContent content={project.description} className="mt-3" />}
            </div>
          </Dialog.Popup>
        )}
      </Dialog.Portal>
    </Dialog.Root>
  );
}
