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
//
// Impacto extra pedido para esta seccion (sin "abusar" de colores, un solo
// tono -- acento -- pero mas intenso): el icono tiene un halo tipo neon que
// pulsa en loop, y cada tarjeta tiene un barrido de brillo diagonal que la
// cruza una vez apenas entra en pantalla.
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
        viewport={{ once: false, amount: 0.25 }}
        variants={container}
        className="mt-10 grid gap-5 sm:grid-cols-2"
      >
        {services.map((service, index) => {
          const Icon = getServiceIcon(service.icon);
          return (
            <motion.div
              key={service.id}
              variants={card}
              className="group relative flex items-start gap-4 overflow-hidden rounded-lg border border-neutral-200 p-4 transition-colors duration-300 hover:border-accent/40 dark:border-neutral-800"
            >
              {/* Barrido de brillo diagonal: una franja clara cruza la
                  tarjeta cada vez que vuelve a entrar en pantalla (variants
                  heredadas de "card", no initial/animate propio -- asi
                  replica en cada reentrada, no solo la primera vez), con un
                  poco de delay por indice para que no se vean las 4-5
                  tarjetas brillando exactamente juntas. pointer-events-none:
                  es solo decorativo. */}
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 -left-1/3 z-10 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-accent/25 to-transparent"
                variants={{
                  hidden: { x: "-40%", opacity: 0 },
                  show: {
                    x: "260%",
                    opacity: [0, 1, 0],
                    transition: { duration: 1.1, delay: 0.5 + index * 0.15, ease: "easeInOut" },
                  },
                }}
              />

              <motion.span
                variants={iconWrap}
                className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent"
              >
                {/* Halo neon: dos anillos pulsando en loop con timings
                    distintos, mas intensos que el "latido" de Value props
                    -- es el unico lugar del sitio con este nivel de brillo,
                    a proposito, para no diluirlo repitiendolo en todas
                    partes. */}
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-accent/40 blur-md"
                  animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: index * 0.25 }}
                />
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full ring-2 ring-accent/50"
                  animate={{ scale: [1, 1.35, 1], opacity: [0.7, 0, 0.7] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: index * 0.25 + 0.3 }}
                />
                <Icon size={20} strokeWidth={1.75} aria-hidden="true" className="relative" />
              </motion.span>
              <div className="relative">
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
