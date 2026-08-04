import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PrinterGridBackground } from "@/components/printer-grid-background";
import { Extruded3DText } from "@/components/extruded-3d-text";
import { HeroHeading } from "./hero-heading";
import { HeroTrustBadges } from "./hero-trust-badges";

// Theme-aware (antes era bg-neutral-950 fijo, sin importar el tema -- se
// veia como un bloque negro roto contra el fondo claro cuando el sitio
// quedo en modo claro por defecto). Ya no tiene un panel de color propio
// (antes bg-neutral-100/dark:bg-neutral-950): el owner marco que ese
// rectangulo generaba una costura visible contra el resto de la pagina
// (que usa var(--background), un tono distinto). Usa el mismo fondo que
// toda la home -- la grilla animada, el glow y la tipografia son los que le
// dan presencia de "seccion de marca", no un bloque de color aparte.

export function Hero() {
  return (
    // "Full-bleed": la seccion se sale del contenedor centrado (max-w-6xl)
    // del resto de la home y ocupa el ancho completo del navegador -- el
    // truco es el clasico left-1/2 + -mx-[50vw] + w-screen, que posiciona
    // la seccion relativa al viewport en vez de a su padre. El contenido de
    // adentro (texto, botones) vuelve a quedar centrado en un
    // mx-auto max-w-6xl propio, para alinear con el resto de la pagina.
    <section
      className="animate-in fade-in slide-in-from-bottom-2 relative left-1/2 right-1/2 -mx-[50vw] flex min-h-[calc(100dvh-4.5rem)] w-screen flex-col items-center justify-center overflow-hidden bg-[var(--background)] px-6 py-16 text-center text-neutral-900 duration-500 sm:py-24 dark:text-white"
    >
      {/* min-h-[calc(100dvh-4.5rem)] (task #33): el Hero ocupa toda la
          altura visible debajo del header sticky (~4.5rem, estimado a partir
          de su padding + el boton de avatar h-8) -- asi en la carga inicial
          no se alcanza a ver ni un pixel de "Como funciona" empujando a
          scrollear un poco para descubrirlo, que era el pedido original. */}
      <PrinterGridBackground />

      <div className="relative mx-auto max-w-6xl">
        {/* Pieza "3D" standalone (rediseno del Hero): antes habia una bola
            (icosaedro en three.js, hero-blueprint-scene.tsx) arriba del
            titulo, y ademas la palabra "3D" suelta incrustada adentro del
            H1. El owner pidio sacar la bola por rebuscada y sacar tambien
            el "3D" del titulo, unificando todo en una sola pieza con forma
            literal de "3D" -- es este mismo Extruded3DText que antes vivia
            adentro de HeroHeading, ahora standalone y mucho mas grande
            (arriba definia su tamano el h1 que lo rodeaba con 2.2em; aca lo
            define directamente el font-size de este contenedor). De paso
            saca three.js/@react-three/fiber de la home por completo (la
            pieza es 100% CSS, mismo criterio liviano que ya tenia). */}
        <div className="mx-auto -mb-2 flex justify-center text-5xl sm:text-6xl" aria-hidden="true">
          <Extruded3DText />
        </div>

        <p className="text-xs font-medium tracking-[0.2em] text-accent uppercase">Diseño + impresión + catálogo</p>
        {/* HeroHeading (antes AnimatedHeading generico): "De la idea al
            objeto" se arma letra por letra, y "y mucho mas" usa un armado
            disparejo que converge al tamano uniforme (UnevenSettleText) --
            ver hero-heading.tsx. */}
        <HeroHeading />
        <p className="mx-auto mt-4 max-w-xl text-balance text-neutral-600 dark:text-neutral-300">
          Catálogo propio para el hogar, la tecnología y los regalos, o tu proyecto hecho pieza a medida: te
          cotizamos antes de cobrarte nada. No somos solo una impresora: diseñamos, fabricamos y armamos tu
          pedido como una tienda de verdad.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="#catalogo"
            className={cn(
              buttonVariants({ variant: "default", size: "lg" }),
              "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/30 active:scale-[0.97]",
            )}
          >
            Ver catálogo
          </Link>
          <Link
            href="/pedido-a-medida"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "border-neutral-300 text-neutral-900 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-neutral-900/5 active:scale-[0.97] dark:border-white/30 dark:text-white dark:hover:bg-white/10",
            )}
          >
            Pedir a medida
          </Link>
        </div>

        <HeroTrustBadges />
      </div>
    </section>
  );
}
