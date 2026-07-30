"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { PublicProject } from "@/lib/projects/queries";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const card = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: "easeOut" as const } },
};

// Grilla de la galeria (task #21): reveal escalonado por scroll, cada foto
// entra en cascada -- mismo lenguaje visual "con vida" que el resto del
// sitio (timeline de pedido a medida, titulos animados) en vez de aparecer
// todo de golpe.
export function ProyectosGallery({ projects }: { projects: PublicProject[] }) {
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
      {projects.map((project) => (
        <motion.figure
          key={project.id}
          variants={card}
          whileHover={{ y: -4 }}
          className="group overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div className="relative aspect-square overflow-hidden">
            <Image
              src={project.imageUrl}
              alt={project.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            />
          </div>
          <figcaption className="p-4">
            <p className="font-medium">{project.title}</p>
            {project.description && (
              <p className="mt-1 text-sm text-neutral-500">{project.description}</p>
            )}
          </figcaption>
        </motion.figure>
      ))}
    </motion.div>
  );
}
