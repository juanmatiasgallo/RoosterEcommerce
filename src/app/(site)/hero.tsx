import Link from "next/link";
import { PackageSearch, ShieldCheck, Truck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Sin foto/logo real todavia (ver docs/spec-homepage-ux.md): en vez de un
// bloque de color plano, dos manchas de acento muy difuminadas (blur-3xl)
// sobre neutral-950 — transmite "premium" sin depender de una imagen que
// todavia no existe, y usa solo utilidades estandar de Tailwind (nada de
// funciones CSS nuevas que puedan fallar en navegadores viejos).
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
    <section className="animate-in fade-in slide-in-from-bottom-2 relative left-1/2 right-1/2 -mx-[50vw] w-screen overflow-hidden bg-neutral-950 px-6 py-16 text-center text-white duration-500 sm:py-24">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-16 h-64 w-64 rounded-full bg-accent/25 blur-3xl" />
        <div className="absolute -right-20 -bottom-24 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <p className="text-xs font-medium tracking-[0.2em] text-accent uppercase">Catalogo + pedidos a medida</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Impresion 3D a tu medida</h1>
        <p className="mx-auto mt-4 max-w-xl text-balance text-neutral-300">
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
              "border-white/30 text-white hover:bg-white/10",
            )}
          >
            Pedir a medida
          </Link>
        </div>

        <ul className="mx-auto mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-neutral-400">
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
