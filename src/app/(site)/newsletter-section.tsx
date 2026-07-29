import { Mail } from "lucide-react";
import { NewsletterForm } from "@/components/newsletter-form";
import { PrinterGridBackground } from "@/components/printer-grid-background";

// Antes vivia en el footer (visible en todo el sitio); el owner pidio que
// quede solo en la home, como una seccion propia con mas presencia visual.
// Full-bleed (mismo truco que el Hero, ver hero.tsx): ocupa todo el ancho
// del navegador, no solo el max-w-6xl del resto de la home.
//
// Theme-aware (era bg-neutral-950 fijo -- el owner lo marco como "muy roto
// para el ojo humano" contra el fondo claro del sitio). Mismo panel
// claro/oscuro que el Hero, mismo fondo animado (PrinterGridBackground) en
// vez de los blobs pulsantes genericos de antes.
export function NewsletterSection() {
  return (
    <section className="relative left-1/2 right-1/2 -mx-[50vw] mt-16 w-screen overflow-hidden bg-neutral-100 px-6 py-14 text-center sm:px-12 dark:bg-neutral-950">
      <PrinterGridBackground />

      <div className="animate-in fade-in slide-in-from-bottom-4 relative mx-auto flex max-w-lg flex-col items-center gap-3 duration-700">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent motion-safe:animate-bounce">
          <Mail size={22} />
        </span>
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white">Suscribite y no te pierdas nada</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Ofertas del catalogo y avisos de pedidos a medida, directo a tu mail. Sin spam.
        </p>
        <div className="mt-2 w-full max-w-sm [&_input]:border-neutral-300 [&_input]:bg-white [&_input]:text-neutral-900 dark:[&_input]:border-neutral-700 dark:[&_input]:bg-neutral-900 dark:[&_input]:text-white">
          <NewsletterForm />
        </div>
      </div>
    </section>
  );
}
