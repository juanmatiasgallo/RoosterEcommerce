import { Mail } from "lucide-react";
import { NewsletterForm } from "@/components/newsletter-form";

// Antes vivia en el footer (visible en todo el sitio); el owner pidio que
// quede solo en la home, como una seccion propia con mas presencia visual
// — mismo criterio de fondo oscuro + glows que el Hero, para que se sienta
// parte de la misma linea de diseno en vez de un elemento suelto. Full-bleed
// (mismo truco que el Hero, ver hero.tsx): el owner pidio explicitamente
// que ocupe todo el ancho del navegador, no solo el max-w-6xl del resto de
// la home -- por eso tambien se saco el rounded-2xl (no tiene sentido un
// borde redondeado pegado al borde del viewport).
export function NewsletterSection() {
  return (
    <section className="relative left-1/2 right-1/2 -mx-[50vw] mt-16 w-screen overflow-hidden bg-neutral-950 px-6 py-14 text-center sm:px-12">
      <div className="pointer-events-none absolute -left-16 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full bg-accent/25 blur-3xl motion-safe:animate-pulse" />
      <div
        className="pointer-events-none absolute -right-16 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full bg-accent/15 blur-3xl motion-safe:animate-pulse"
        style={{ animationDelay: "1.2s" }}
      />

      <div className="animate-in fade-in slide-in-from-bottom-4 relative mx-auto flex max-w-lg flex-col items-center gap-3 duration-700">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent motion-safe:animate-bounce">
          <Mail size={22} />
        </span>
        <h2 className="text-2xl font-semibold text-white">Suscribite y no te pierdas nada</h2>
        <p className="text-sm text-neutral-400">
          Ofertas del catalogo y avisos de pedidos a medida, directo a tu mail. Sin spam.
        </p>
        <div className="mt-2 w-full max-w-sm [&_input]:bg-neutral-900 [&_input]:text-white [&_input]:border-neutral-700">
          <NewsletterForm />
        </div>
      </div>
    </section>
  );
}
