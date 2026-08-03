"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PublicProject } from "@/lib/projects/queries";
import { getProjectThemeIcon, getProjectThemeLabel } from "@/lib/projects/theme-registry";

const AUTOPLAY_MS = 6000;

// Carousel del hero de /proyectos (task #147: "un carrusel con los
// proyectos... con lo mas importante y destacado, pasandose entre ellas de
// una forma muy bonita"). Solo se arma con proyectos marcados `featured`
// desde el admin -- ver proyectos-experience.tsx para el fallback cuando
// no hay ninguno marcado. Autoplay + swipe/click de flechas + dots, pausa
// al pasar el mouse para no pelear con el usuario si esta leyendo.
export function ProyectosHeroCarousel({
  projects,
  onSelect,
}: {
  projects: PublicProject[];
  onSelect: (project: PublicProject) => void;
}) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  const goTo = useCallback(
    (next: number) => {
      setDirection(next > index ? 1 : -1);
      setIndex((next + projects.length) % projects.length);
    },
    [index, projects.length],
  );

  useEffect(() => {
    if (isPaused || projects.length <= 1) return;
    const timer = setInterval(() => {
      setDirection(1);
      setIndex((prev) => (prev + 1) % projects.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [isPaused, projects.length]);

  if (projects.length === 0) return null;

  const current = projects[index];
  const ThemeIcon = getProjectThemeIcon(current.theme);
  const themeLabel = getProjectThemeLabel(current.theme);

  return (
    <div
      className="relative mx-auto mt-8 aspect-[16/9] w-full max-w-4xl overflow-hidden rounded-2xl shadow-lg sm:aspect-[21/9]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <AnimatePresence initial={false} custom={direction}>
        <motion.button
          key={current.id}
          type="button"
          onClick={() => onSelect(current)}
          custom={direction}
          initial={{ opacity: 0, x: direction > 0 ? 60 : -60, scale: 1.02 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: direction > 0 ? -60 : 60, scale: 0.98 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="absolute inset-0 h-full w-full cursor-pointer text-left"
          aria-label={`Ver proyecto: ${current.title}`}
        >
          <Image
            src={current.imageUrl}
            alt={current.title}
            fill
            priority={index === 0}
            className="object-cover"
            sizes="(min-width: 1024px) 900px, 100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-5 sm:p-8">
            {themeLabel && (
              <span className="flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                <ThemeIcon size={13} /> {themeLabel}
              </span>
            )}
            <h2 className="text-xl font-semibold text-white sm:text-2xl">{current.title}</h2>
            {current.description && (
              <p className="line-clamp-1 max-w-xl text-sm text-white/80 sm:line-clamp-2">
                {current.description.replace(/[#*_`]/g, "")}
              </p>
            )}
          </div>
        </motion.button>
      </AnimatePresence>

      {projects.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="Proyecto anterior"
            className="absolute top-1/2 left-3 z-10 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="Proyecto siguiente"
            className="absolute top-1/2 right-3 z-10 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
          >
            <ChevronRight size={18} />
          </button>

          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
            {projects.map((project, i) => (
              <button
                key={project.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Ir al proyecto ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/75"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
