"use client";

import { motion } from "framer-motion";
import { AnimatedParagraph } from "@/components/animated-paragraph";
import { SectionIntro } from "@/components/section-intro";
import { cn } from "@/lib/utils";
import type { DeliveryTierRow } from "@/lib/site-content/actions";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.28, delayChildren: 0.15 } },
};

// El numero "viene al frente" igual que los iconos de Value props (scale >
// 1 al arrancar), pero sin spring -- ac es tipografia grande, un rebote se
// veria raro en un numero. Tween suave en cambio.
const card = {
  hidden: { opacity: 0, scale: 0.92, y: 14 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

// Estilo "semaforo": mas rapido = verde, mas lento = rojo, con una parada
// intermedia amarillo/naranja segun cuantos tiers haya. Clases completas
// (no interpoladas con template strings) a proposito -- Tailwind necesita
// ver la clase literal en el codigo para generarla, una clase armada en
// runtime tipo `text-${color}-600` no se genera nunca.
const SEMAFORO_STOPS = [
  {
    text: "text-emerald-600 dark:text-emerald-400",
    glow: "bg-emerald-500/25",
    ring: "ring-emerald-500/25",
    dot: "bg-emerald-500",
  },
  {
    text: "text-lime-600 dark:text-lime-400",
    glow: "bg-lime-500/25",
    ring: "ring-lime-500/25",
    dot: "bg-lime-500",
  },
  {
    text: "text-amber-600 dark:text-amber-400",
    glow: "bg-amber-500/25",
    ring: "ring-amber-500/25",
    dot: "bg-amber-500",
  },
  {
    text: "text-orange-600 dark:text-orange-400",
    glow: "bg-orange-500/25",
    ring: "ring-orange-500/25",
    dot: "bg-orange-500",
  },
  {
    text: "text-red-600 dark:text-red-400",
    glow: "bg-red-500/25",
    ring: "ring-red-500/25",
    dot: "bg-red-500",
  },
];

function semaforoStyle(index: number, total: number) {
  if (total <= 1) return SEMAFORO_STOPS[0];
  const ratio = index / (total - 1);
  const stopIndex = Math.round(ratio * (SEMAFORO_STOPS.length - 1));
  return SEMAFORO_STOPS[stopIndex];
}

// Tarjetas con la tipografia grande del rango (numero) como protagonista, y
// ahora coloreadas tipo semaforo (verde = mas rapido, rojo = mas lento)
// segun el orden en que el admin las cargo -- mucho mas facil de leer de
// un vistazo que cuando las 3 eran del mismo color de acento. El glow
// pulsante detras de cada numero le da vida/impacto sin depender de que el
// usuario scrollee mas.
export function DeliveryTimesSectionClient({ tiers }: { tiers: DeliveryTierRow[] }) {
  return (
    <section className="py-14">
      <SectionIntro
        eyebrow="Entrega"
        heading="Tiempos de entrega"
        subtitle="Coordinamos entrega en Montevideo o envio a todo el pais."
      />

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: false, amount: 0.3 }}
        variants={container}
        className="mt-10 grid gap-6 sm:grid-cols-3"
      >
        {tiers.map((tier, index) => {
          const style = semaforoStyle(index, tiers.length);
          return (
            <motion.div
              key={tier.id}
              variants={card}
              className={cn(
                "relative rounded-lg border border-neutral-200 p-5 text-center ring-1 ring-inset dark:border-neutral-800",
                style.ring,
              )}
            >
              {/* Glow de fondo, pulsando en loop -- mismo criterio que el
                  "latido" de Value props (task #30), pero mas grande y
                  coloreado por semaforo en vez de un unico acento parejo. */}
              <motion.span
                aria-hidden="true"
                className={cn("pointer-events-none absolute -top-6 left-1/2 -z-10 h-24 w-24 -translate-x-1/2 rounded-full blur-2xl", style.glow)}
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.9, 0.5] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: index * 0.35 }}
              />

              <span className={cn("mx-auto mb-2 flex h-2 w-2 items-center justify-center rounded-full", style.dot)} aria-hidden="true" />

              <p className={cn("font-heading text-4xl font-semibold", style.text)}>{tier.rangeLabel}</p>
              <p className="text-xs tracking-wide text-neutral-400 uppercase">{tier.unitLabel}</p>
              <h3 className="font-heading mt-3 text-sm font-medium">{tier.title}</h3>
              <AnimatedParagraph
                text={tier.description}
                delay={0.45}
                stagger={0.06}
                className="mt-1 block text-sm text-neutral-500 dark:text-neutral-400"
              />
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
