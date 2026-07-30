"use client";

import { motion } from "framer-motion";
import { AnimatedParagraph } from "@/components/animated-paragraph";
import { SectionIntro } from "@/components/section-intro";
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

// Tarjetas con la tipografia grande del rango (numero) como protagonista --
// asi se lee de un vistazo, sin tener que leer todo el texto, igual que en
// la referencia que paso el owner.
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
        viewport={{ once: true, amount: 0.3 }}
        variants={container}
        className="mt-10 grid gap-6 sm:grid-cols-3"
      >
        {tiers.map((tier) => (
          <motion.div
            key={tier.id}
            variants={card}
            className="rounded-lg border border-neutral-200 p-5 text-center dark:border-neutral-800"
          >
            <p className="font-heading text-4xl font-semibold text-accent">{tier.rangeLabel}</p>
            <p className="text-xs tracking-wide text-neutral-400 uppercase">{tier.unitLabel}</p>
            <h3 className="font-heading mt-3 text-sm font-medium">{tier.title}</h3>
            <AnimatedParagraph
              text={tier.description}
              delay={0.45}
              stagger={0.06}
              className="mt-1 block text-sm text-neutral-500 dark:text-neutral-400"
            />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
