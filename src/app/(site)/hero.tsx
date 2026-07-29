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
    <section className="animate-in fade-in slide-in-from-bottom-2 relative left-1/2 right-1/2 -mx-[50vw] w-screen overflow-hidden bg-neutral-100 px-6 py-16 text-center text-neutral-900 duration-500 sm:py-24 dark:bg-neutral-950 dark:text-white">
      <PrinterGridBackground />

      <div className="relative mx-auto max-w-6xl">
        <p className="text-xs font-medium tracking-[0.2em] text-accent uppercase">Catalogo + pedidos a medida</p>
        <AnimatedHeading
          as="h1"
          text="Impresion 3D a tu medida"
          className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl"
        />
        <p className="mx-auto mt-4 max-w-xl text-balance text-neutral-600 dark:text-neutral-300">
          Elegi una pieza de nuestro catalogo o subi tu propio diseno: te cotizamos antes de cobrarte nada y lo
          imprimimos para vos.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="#catalogo" className={buttonVariants({ variant: "default", size: "lg" })}>
            Ver catalogo
          </Link>
          <Link
            href="/pedido-a-medida"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "border-neutral-300 text-neutral-900 hover:bg-neutral-900/5 dark:border-white/30 dark:text-white dark:hover:bg-white/10",
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
