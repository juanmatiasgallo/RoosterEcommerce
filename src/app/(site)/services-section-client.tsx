"use client";

import { motion } from "framer-motion";
import { AnimatedParagraph } from "@/components/animated-paragraph";
import { SectionIntro } from "@/components/section-intro";
import { getServiceIcon } from "@/lib/site-content/icon-registry";
import type { ServiceRow } from "@/lib/site-content/actions";

// Mismo tratamiento de tiempo que "Como funciona"/Value props (tasks
// #35/#36): nada de springs rigidos ni stagger apretado, para que las 3
// secciones nuevas se sientan parte de la misma familia visual.
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.28, delayChildren: 0.15 } },
};

const card = {
  hidden: {},
  show: { transition: { staggerChildren: 0.18 } },
};

const iconWrap = {
  hidden: { opacity: 0, scale: 1.7, y: -6 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 110, damping: 18, mass: 0.9 } },
};

const title = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const, delay: 0.2 } },
};

// Tarjetas horizontales (icono a la izquierda, texto a la derecha) en vez
// del layout vertical de Value props -- variedad visual entre secciones
// consecutivas que comparten la misma coreografia de entrada.
export function ServicesSectionClient({ services }: { services: ServiceRow[] }) {
  return (
    <section className="py-14">
      <SectionIntro
        eyebrow="Servicios"
        heading="¿Que hacemos?"
        subtitle="Imprimimos lo que necesitas, ya sea tu propio diseno o uno que buscamos por vos."
      />

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.25 }}
        variants={container}
        className="mt-10 grid gap-5 sm:grid-cols-2"
      >
        {services.map((service) => {
          const Icon = getServiceIcon(service.icon);
          return (
            <motion.div
              key={service.id}
              variants={card}
              className="flex items-start gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <motion.span
                variants={iconWrap}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent"
              >
                <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
              </motion.span>
              <div>
                <motion.h3 variants={title} className="font-heading text-sm font-medium">
                  {service.title}
                </motion.h3>
                <AnimatedParagraph
                  text={service.description}
                  delay={0.45}
                  stagger={0.06}
                  className="mt-1 block text-sm text-neutral-500 dark:text-neutral-400"
                />
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
