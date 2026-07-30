import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PrinterGridBackground } from "@/components/printer-grid-background";
import { HeroHeading } from "./hero-heading";
import { HeroTrustBadges } from "./hero-trust-badges";

// Theme-aware (antes era bg-neutral-950 fijo, sin importar el tema -- se
// veia como un bloque negro roto contra el fondo claro cuando el sitio
// quedo en modo claro por defecto). En claro usa un panel tintado suave
// (neutral-100), en oscuro el panel oscuro de siempre. La grilla animada
// (PrinterGridBackground) reemplaza los blobs difuminados genericos: se
// pidio algo tematico a la impresion 3D en vez de manchas de color sueltas.

export function Hero() {
  return (
    // "Full-bleed": la seccion se sale del contenedor centrado (max-w-6xl)
    // del resto de la home y ocupa el ancho completo del navegador -- el
    // truco es el clasico left-1/2 + -mx-[50vw] + w-screen, que posiciona
    // la seccion relativa al viewport en vez de a su padre. El contenido de
    // adentro (texto, botones) vuelve a quedar centrado en un
    // mx-auto max-w-6xl propio, para alinear con el resto de la pagina.
    <section
      className="animate-in fade-in slide-in-from-bottom-2 relative left-1/2 right-1/2 -mx-[50vw] flex min-h-[calc(100dvh-4.5rem)] w-screen flex-col items-center justify-center overflow-hidden bg-neutral-100 px-6 py-16 text-center text-neutral-900 duration-500 sm:py-24 dark:bg-neutral-950 dark:text-white"
    >
      {/* min-h-[calc(100dvh-4.5rem)] (task #33): el Hero ocupa toda la
          altura visible debajo del header sticky (~4.5rem, estimado a partir
          de su padding + el boton de avatar h-8) -- asi en la carga inicial
          no se alcanza a ver ni un pixel de "Como funciona" empujando a
          scrollear un poco para descubrirlo, que era el pedido original. */}
      <PrinterGridBackground />

      <div className="relative mx-auto max-w-6xl">
        <p className="text-xs font-medium tracking-[0.2em] text-accent uppercase">Catalogo + pedidos a medida</p>
        {/* HeroHeading (antes AnimatedHeading generico): "Impresion" se
            arma letra por letra igual que siempre, pero "3D" ahora es una
            pieza aparte con relieve 3D real (Extruded3DText) y "a tu
            medida" usa un armado disparejo que converge al tamano uniforme
            (UnevenSettleText) -- ver hero-heading.tsx. */}
        <HeroHeading />
        <p className="mx-auto mt-4 max-w-xl text-balance text-neutral-600 dark:text-neutral-300">
          Elegi una pieza de nuestro catalogo o subi tu propio diseno: te cotizamos antes de cobrarte nada y lo
          imprimimos para vos.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="#catalogo"
            className={cn(
              buttonVariants({ variant: "default", size: "lg" }),
              "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/30 active:scale-[0.97]",
            )}
          >
            Ver catalogo
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
