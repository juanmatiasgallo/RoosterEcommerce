import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PrinterGridBackground } from "@/components/printer-grid-background";
import { HeroHeading } from "./hero-heading";
import { HeroObjectScene } from "./hero-object-scene";
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

      {/* Pieza 3D del owner (task #196/#197, public/models/hero-object.obj):
          a diferencia de los intentos anteriores (astronauta, bola
          icosaedro, letras "3D" en relieve -- todos sacados por no sumar a
          la experiencia o pesar de mas), esta va "a un lado" en vez de
          compitiendo con el titulo en el centro. Absolute + pointer-events-none,
          posicionada relativa a la seccion (full-bleed, w-screen) cerca del
          borde derecho real de la pantalla -- el texto (mas angosto, ver
          max-w-xl/max-w-2xl mas abajo) queda centrado y nunca se solapa. Se
          esconde por debajo de lg: en pantallas angostas no hay espacio real
          al costado del texto, y no vale la pena pagar el costo de un canvas
          WebGL en mobile por algo puramente decorativo. Tamano/posicion
          ajustados a ojo (bbox del modelo, sin poder previsualizar el
          render real en este entorno) -- revisar en pantalla y retocar los
          valores de right/tamano si queda muy pegado al texto o muy chico. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-[2%] hidden h-64 w-64 -translate-y-1/2 lg:block xl:h-80 xl:w-80 xl:right-[6%] 2xl:h-96 2xl:w-96"
      >
        <HeroObjectScene />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <p className="text-xs font-medium tracking-[0.2em] text-accent uppercase">Catálogo + Diseño + Impresión</p>
        {/* HeroHeading (antes AnimatedHeading generico): "De la idea al
            objeto" se arma letra por letra, y "y mucho mas" usa un armado
            disparejo que converge al tamano uniforme (UnevenSettleText) --
            ver hero-heading.tsx. */}
        <HeroHeading />
        <p className="mx-auto mt-4 max-w-xl text-balance text-neutral-600 dark:text-neutral-300">
          Catálogo propio para el hogar, la tecnología y regalos, o tu proyecto hecho pieza a medida: te
          cotizamos, te notificamos, lo aceptás y te lo imprimimos. Diseñamos, fabricamos y armamos tu pedido.
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
