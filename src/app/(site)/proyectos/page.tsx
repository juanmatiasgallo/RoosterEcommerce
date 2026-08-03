import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { listPublicProjects } from "@/lib/projects/queries";
import { PrinterGridBackground } from "@/components/printer-grid-background";
import { AnimatedHeading } from "@/components/animated-heading";
import { NewsletterSection } from "../newsletter-section";
import { ProyectosExperience } from "./proyectos-experience";

const DESCRIPTION =
  "Galeria de trabajos impresos: piezas de catalogo y pedidos a medida ya entregados. Decoracion, regalos, cosplay, gaming, repuestos y mas.";

// Async (a diferencia del `export const metadata` original) para poder
// armar openGraph.images con la primera foto real de la galeria (task
// #147, mejora de SEO) -- listPublicProjects() esta cacheada por request
// via fetch/DB normal de Next, llamarla aca y de nuevo en la pagina no
// duplica trabajo real.
export async function generateMetadata(): Promise<Metadata> {
  const projects = await listPublicProjects();
  const firstImage = projects[0]?.imageUrl;

  return {
    title: "Proyectos | Tienda 3D",
    description: DESCRIPTION,
    openGraph: {
      title: "Proyectos que ya imprimimos",
      description: DESCRIPTION,
      images: firstImage ? [{ url: firstImage }] : undefined,
    },
  };
}

// Consulta la DB: sin esto, el build de Docker en EasyPanel intenta
// pre-renderizarla en build time y falla (no tiene red hacia la base ahi).
export const dynamic = "force-dynamic";

export default async function ProyectosPage() {
  const projects = await listPublicProjects();

  // JSON-LD (task #147, "SEO"): describe la galeria como ImageGallery para
  // que los buscadores puedan indexar cada foto individualmente, no solo
  // el texto de la pagina. Server Component -- se arma con datos ya
  // cargados, sin pegarle de nuevo a la DB.
  const baseUrl = (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    name: "Proyectos que ya imprimimos",
    description: DESCRIPTION,
    url: `${baseUrl}/proyectos`,
    image: projects.slice(0, 20).map((project) => ({
      "@type": "ImageObject",
      contentUrl: project.imageUrl.startsWith("http") ? project.imageUrl : `${baseUrl}${project.imageUrl}`,
      name: project.title,
      description: project.description ?? undefined,
    })),
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Full-bleed, mismo patron que Hero/pedido-a-medida: banner
          theme-aware con la grilla animada de impresora de fondo. */}
      <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen overflow-hidden bg-[var(--background)] px-6 py-14 text-center text-neutral-900 sm:py-20 dark:text-white">
        <PrinterGridBackground />

        <div className="relative mx-auto max-w-xl">
          <div className="mx-auto flex w-fit items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
            <Sparkles size={13} />
            Trabajos reales, entregados
          </div>
          <AnimatedHeading
            as="h1"
            text="Proyectos que ya imprimimos"
            className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
          />
          <p className="mx-auto mt-3 max-w-md text-balance text-neutral-600 dark:text-neutral-300">
            Una muestra de piezas de catalogo y pedidos a medida que ya entregamos, para que veas la calidad antes
            de pedir la tuya.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        <ProyectosExperience projects={projects} />
      </div>

      <NewsletterSection />
    </main>
  );
}
