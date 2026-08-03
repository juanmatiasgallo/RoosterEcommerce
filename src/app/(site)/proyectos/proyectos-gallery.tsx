"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { PublicProject } from "@/lib/projects/queries";
import { getProjectThemeIcon, getProjectThemeLabel } from "@/lib/projects/theme-registry";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const card = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: "easeOut" as const } },
};

// Grilla de la galeria (task #21, retocada en #147): reveal escalonado por
// scroll, cada foto entra en cascada -- mismo lenguaje visual "con vida"
// que el resto del sitio. Cada card ahora es clickeable (abre el lightbox
// con la descripcion completa en Markdown) y muestra la tematica si tiene.
export function ProyectosGallery({
  projects,
  onSelect,
}: {
  projects: PublicProject[];
  onSelect: (project: PublicProject) => void;
}) {
  if (projects.length === 0) {
    return (
      <p className="py-14 text-center text-sm text-neutral-500">
        Todavia no cargamos fotos de trabajos terminados. Volve pronto.
      </p>
    );
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: false, amount: 0.15 }}
      variants={container}
      className="grid gap-5 py-10 sm:grid-cols-2 lg:grid-cols-3"
    >
      {projects.map((project) => {
        const ThemeIcon = getProjectThemeIcon(project.theme);
        const themeLabel = getProjectThemeLabel(project.theme);

        return (
          <motion.button
            key={project.id}
            type="button"
            onClick={() => onSelect(project)}
            variants={card}
            whileHover={{ y: -4 }}
            className="group overflow-hidden rounded-xl border border-neutral-200 bg-white text-left shadow-sm transition-shadow duration-300 hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="relative aspect-square overflow-hidden">
              <Image
                src={project.imageUrl}
                alt={project.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              />
              {themeLabel && (
                <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
                  <ThemeIcon size={11} /> {themeLabel}
                </span>
              )}
            </div>
            <div className="p-4">
              <p className="font-medium">{project.title}</p>
              {project.description && (
                <p className="mt-1 line-clamp-2 text-sm text-neutral-500">
                  {project.description.replace(/[#*_`]/g, "")}
                </p>
              )}
            </div>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
