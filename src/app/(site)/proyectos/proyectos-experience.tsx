"use client";

import { useMemo, useState } from "react";
import type { PublicProject } from "@/lib/projects/queries";
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { ProyectosHeroCarousel } from "./proyectos-hero-carousel";
import { ProyectosGallery } from "./proyectos-gallery";
import { ProjectLightbox } from "./project-lightbox";

const MAX_CAROUSEL_SLIDES = 6;

// Orquesta el hero carousel + la grilla paginada + el lightbox de detalle
// (task #147), todos compartiendo el mismo estado de "proyecto
// seleccionado" -- por eso viven en un solo Client Component en vez de
// quedar sueltos en el Server Component de page.tsx.
export function ProyectosExperience({ projects }: { projects: PublicProject[] }) {
  const [selected, setSelected] = useState<PublicProject | null>(null);
  const { page, setPage, totalPages, pageItems } = usePagination(projects);

  // "lo mas importante y destacado" (pedido del owner) = los marcados
  // featured desde el admin. Si todavia no marco ninguno, el carousel no se
  // queda vacio: usa los primeros de la grilla (ya vienen ordenados por
  // `position`) para que la seccion no se sienta rota antes de que carguen
  // el flag por primera vez.
  const carouselProjects = useMemo(() => {
    const featured = projects.filter((p) => p.featured);
    return (featured.length > 0 ? featured : projects).slice(0, MAX_CAROUSEL_SLIDES);
  }, [projects]);

  return (
    <>
      <ProyectosHeroCarousel projects={carouselProjects} onSelect={setSelected} />

      <h2 className="mt-14 text-2xl font-semibold">Todos los trabajos</h2>
      <ProyectosGallery projects={pageItems} onSelect={setSelected} />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <ProjectLightbox project={selected} onClose={() => setSelected(null)} />
    </>
  );
}
