"use client";

import { useEffect, useState } from "react";
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
  // Bug reportado por el owner: al cerrar (Escape, click afuera o la X) la
  // pantalla quedaba nublada (el backdrop con blur pegado) y Escape dejaba
  // de responder. Causa: antes Dialog.Popup se montaba/desmontaba a mano
  // con `{project && (...)}`, envolviendolo. En el mismo instante en que
  // `project` pasaba a null, React sacaba el Popup del arbol de golpe --
  // le robaba a Base UI el control de su propio cierre (animacion, listener
  // de Escape, devolver el foco), dejando el backdrop huerfano sin nada que
  // lo termine de sacar. Ahora Dialog.Popup queda SIEMPRE montado (Base UI
  // decide solo cuando sacarlo del DOM real segun open/closed) y mostramos
  // el ULTIMO proyecto no nulo mientras corre la animacion de salida, para
  // no dejar el contenido en blanco durante el fade-out.
  const [displayProject, setDisplayProject] = useState<PublicProject | null>(null);
  useEffect(() => {
    if (project) setDisplayProject(project);
  }, [project]);

  const ThemeIcon = displayProject ? getProjectThemeIcon(displayProject.theme) : null;
  const themeLabel = displayProject ? getProjectThemeLabel(displayProject.theme) : null;

  return (
    <Dialog.Root open={project !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex max-h-[90vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 dark:border-neutral-800 dark:bg-neutral-900">
          {displayProject && (
            <>
              <Dialog.Close
                aria-label="Cerrar"
                className="absolute top-3 right-3 z-10 rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
              >
                <X size={16} />
              </Dialog.Close>

              <div className="relative aspect-video w-full shrink-0 bg-neutral-100 dark:bg-neutral-950">
                <Image src={displayProject.imageUrl} alt={displayProject.title} fill className="object-cover" sizes="700px" />
              </div>

              <div className="overflow-y-auto p-5 sm:p-6">
                {themeLabel && ThemeIcon && (
                  <span className="mb-2 flex w-fit items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                    <ThemeIcon size={13} /> {themeLabel}
                  </span>
                )}
                <Dialog.Title className="text-xl font-semibold sm:text-2xl">{displayProject.title}</Dialog.Title>
                {displayProject.description && (
                  <MarkdownContent content={displayProject.description} className="mt-3" />
                )}
              </div>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
