import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Hero() {
  return (
    <section className="rounded-xl bg-neutral-900 px-6 py-14 text-center text-white sm:py-20 dark:bg-neutral-950">
      <h1 className="text-3xl font-semibold sm:text-4xl">Impresion 3D a tu medida</h1>
      <p className="mx-auto mt-3 max-w-xl text-neutral-300">
        Elegi una pieza de nuestro catalogo o subi tu propio diseno y te lo imprimimos a medida.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href="#catalogo" className={buttonVariants({ variant: "default", size: "lg" })}>
          Ver catalogo
        </Link>
        <Link
          href="/pedido-a-medida"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "border-white/30 text-white hover:bg-white/10")}
        >
          Pedir a medida
        </Link>
      </div>
    </section>
  );
}
