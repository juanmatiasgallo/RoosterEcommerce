import Link from "next/link";
import { PackageSearch, ShieldCheck, Truck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PrinterGridBackground } from "@/components/printer-grid-background";
import { AnimatedHeading } from "@/components/animated-heading";

// Theme-aware (antes era bg-neutral-950 fijo, sin importar el tema -- se
// veia como un bloque negro roto contra el fondo claro cuando el sitio
// quedo en modo claro por defecto). En claro usa un panel tintado suave
// (neutral-100), en oscuro el panel oscuro de siempre. La grilla animada
// (PrinterGridBackground) reemplaza los blobs difuminados genericos: se
// pidio algo tematico a la impresion 3D en vez de manchas de color sueltas.
const TRUST_BADGES = [
  { icon: ShieldCheck, label: "Pago seguro con Mercado Pago" },
  { icon: Truck, label: "Coordinamos el envio a todo el pais" },
  { icon: PackageSearch, label: "Cotizacion antes de pagar" },
];

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
        {/* Dos lineas, un solo h1: la 1ra neutra, la 2da con el color de
            acento + un glow radial detras (bg-accent/25 blur-3xl) para que
            resalte lo principal, mas presencia que una linea de texto plano.
            splitBy="letter" arma la frase letra por letra en vez de por
            palabra, mas "vivo" para el titulo mas grande del sitio. */}
        {/* Ritmo mucho mas lento que el resto de los titulos del sitio
            (task #34): stagger 0.09 (antes 0.025) entre letras, cada letra
            tarda 0.85s en asentarse (antes 0.55s) y la segunda linea arranca
            0.45s despues de la primera (antes 0.15s) -- se nota como un
            armado deliberado, letra por letra, en vez de un parpadeo. */}
        <AnimatedHeading
          as="h1"
          text={["Impresion 3D", "a tu medida"]}
          lineClassName={["", "text-accent"]}
          splitBy="letter"
          glow
          stagger={0.09}
          duration={0.85}
          lineDelay={0.45}
          className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl"
        />
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

        <ul className="mx-auto mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-neutral-500 dark:text-neutral-400">
          {TRUST_BADGES.map((badge) => (
            <li key={badge.label} className="flex items-center gap-1.5">
              <badge.icon size={15} className="text-accent" aria-hidden="true" />
              {badge.label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
