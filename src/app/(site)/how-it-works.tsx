"use client";

import { motion } from "framer-motion";
import { FileUp, MessageSquareText, PackageCheck } from "lucide-react";
import { AnimatedHeading } from "@/components/animated-heading";

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

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.4, delayChildren: 0.1 } },
};

// Cada paso "materializa" en su lugar (scale + opacity, nunca top/left) en
// vez de solo desvanecer hacia arriba -- junto con el glow que lo acompaña
// (abajo), da la sensacion de que el foco de atencion se mueve de un paso
// al siguiente, sin necesitar animar posicion real (mas caro, menos fluido).
const step = {
  hidden: { opacity: 0, scale: 0.75, y: 14 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 22 } },
};

const glowPulse = {
  hidden: { opacity: 0, scale: 0.4 },
  show: {
    opacity: [0, 0.55, 0],
    scale: [0.4, 1.4, 1.8],
    transition: { duration: 1.1, ease: "easeOut" as const },
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
      <AnimatedHeading text="Como funciona el pedido a medida" className="text-center text-2xl font-semibold" />

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        variants={container}
        className="relative mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8"
      >
        <div className="absolute top-6 right-[16.5%] left-[16.5%] hidden h-px bg-neutral-200 sm:block dark:bg-neutral-800">
          <motion.div
            className="h-full origin-left bg-accent"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: [0, 0.5, 1] }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 1.6, ease: "easeInOut", delay: 0.3, times: [0, 0.55, 1] }}
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
            <p className="mt-1 max-w-56 text-sm text-neutral-500 dark:text-neutral-300">{item.description}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
