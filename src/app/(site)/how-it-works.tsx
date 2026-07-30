"use client";

import { motion } from "framer-motion";
import { FileUp, MessageSquareText, PackageCheck } from "lucide-react";
import { AnimatedHeading } from "@/components/animated-heading";
import { AnimatedParagraph } from "@/components/animated-paragraph";

const STEPS = [
  {
    icon: FileUp,
    title: "Subi tu archivo",
    description: "Mandanos tu diseno en .stl o .obj, con las especificaciones que necesites.",
  },
  {
    icon: MessageSquareText,
    title: "Te cotizamos",
    description: "Te enviamos un precio antes de cobrarte nada.",
  },
  {
    icon: PackageCheck,
    title: "Lo imprimimos y te lo enviamos",
    description: "Confirmas el pago y arrancamos a imprimir tu pieza.",
  },
];

// Coreografia mas lenta e integrada (task #35): la linea conectora arranca
// primero (casi sin delay) y sigue dibujandose mientras los pasos van
// apareciendo detras de ella -- antes cada paso "saltaba" a su posicion casi
// de golpe (spring bien rigido) y todo el conjunto se sentia como dos
// bloques separados (linea + iconos) en vez de un solo flujo continuo.
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.55, delayChildren: 0.25 } },
};

// Spring mas blando (antes stiffness 260/damping 22, se sentia como un
// "pop" instantaneo) -- ahora tarda mas en asentarse y el rebote final es
// mas sutil, sin inicio ni fin brusco.
const step = {
  hidden: { opacity: 0, scale: 0.75, y: 14 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 110, damping: 18, mass: 0.9 } },
};

const glowPulse = {
  hidden: { opacity: 0, scale: 0.4 },
  show: {
    opacity: [0, 0.5, 0],
    scale: [0.4, 1.4, 1.9],
    transition: { duration: 1.5, ease: "easeOut" as const },
  },
};

// Timeline animada (task #18, coreografia reforzada en task #26): scroll
// triggered (whileInView) y secuencial -- la linea conectora se dibuja
// mientras cada paso "aparece" con su propio destello detras (glowPulse),
// dando la lectura de que el flujo avanza de un paso al siguiente en vez de
// que los 3 aparezcan juntos. Todo con transform/opacity (nunca top/width),
// para que se mantenga a 60fps.
export function HowItWorks() {
  return (
    <section className="py-14">
      <AnimatedHeading
        text="Como funciona el pedido a medida"
        stagger={0.06}
        duration={0.65}
        className="text-center text-2xl font-semibold"
      />

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        variants={container}
        className="relative mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8"
      >
        <div className="absolute top-6 right-[16.5%] left-[16.5%] hidden h-px bg-neutral-200 sm:block dark:bg-neutral-800">
          {/* Sin keyframes intermedios (antes [0, 0.5, 1] con un "times"
              fijo): ese quiebre a mitad de camino se sentia como un cambio
              de ritmo brusco. Un solo tramo con easeInOut alarga el dibujo
              de la linea (2.2s, arranca casi enseguida) y la hace de guia
              visual mientras los pasos van apareciendo detras, en vez de
              adelantarse y terminar antes que ellos. */}
          <motion.div
            className="h-full origin-left bg-accent"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 2.2, ease: "easeInOut", delay: 0.15 }}
          />
        </div>

        {STEPS.map((item, index) => (
          <motion.div key={item.title} variants={step} className="relative z-10 flex flex-col items-center text-center">
            <div className="relative flex h-12 w-12 items-center justify-center">
              <motion.span
                aria-hidden="true"
                variants={glowPulse}
                className="absolute inset-0 rounded-full bg-accent blur-md"
              />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent ring-4 ring-white dark:ring-neutral-950">
                <item.icon className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
              </div>
            </div>
            <p className="mt-3 text-xs font-medium text-neutral-400">Paso {index + 1}</p>
            <h3 className="font-heading mt-1 font-medium">{item.title}</h3>
            {/* Segundo tiempo del reveal (task #31): el icono+titulo ya
                aparecieron como parte de "step" de arriba; la descripcion
                arranca con su propio delay para leerse recien despues,
                letra a letra a un ritmo comodo, no todo junto de una. */}
            <AnimatedParagraph
              text={item.description}
              delay={0.45}
              stagger={0.065}
              className="mt-1 block max-w-56 text-sm text-neutral-500 dark:text-neutral-300"
            />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
