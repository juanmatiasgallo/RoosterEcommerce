"use client";

import { motion } from "framer-motion";
import { MessageSquareText, PackageCheck, Upload } from "lucide-react";

const STEPS = [
  {
    icon: Upload,
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
  show: { transition: { staggerChildren: 0.35 } },
};

const step = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 24 } },
};

// Timeline animada (task #18): antes los 3 pasos aparecian todos juntos al
// cargar la pagina (animate-in de Tailwind, dispara una sola vez al montar,
// asi que para cuando el usuario scrollea hasta aca ya paso). Ahora el
// reveal es scroll-triggered (whileInView) y secuencial: la linea
// conectora se "dibuja" de izquierda a derecha mientras los pasos van
// apareciendo uno por uno, para que se lea como una linea de tiempo real
// en vez de un bloque estatico.
export function HowItWorks() {
  return (
    <section className="py-14">
      <h2 className="text-center text-2xl font-semibold">Como funciona el pedido a medida</h2>

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        variants={container}
        className="relative mt-10 grid gap-10 sm:grid-cols-3 sm:gap-8"
      >
        <div className="absolute top-6 right-[16.5%] left-[16.5%] hidden h-px bg-neutral-200 sm:block dark:bg-neutral-800">
          <motion.div
            className="h-full origin-left bg-accent"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 1.1, ease: "easeInOut", delay: 0.2 }}
          />
        </div>

        {STEPS.map((item, index) => (
          <motion.div key={item.title} variants={step} className="relative z-10 flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0.6 }}
              whileInView={{ scale: [0.6, 1.15, 1] }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: index * 0.35 + 0.15, ease: "easeOut" }}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent ring-4 ring-white dark:ring-neutral-950"
            >
              <item.icon className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
            </motion.div>
            <p className="mt-3 text-xs font-medium text-neutral-400">Paso {index + 1}</p>
            <h3 className="mt-1 font-medium">{item.title}</h3>
            <p className="mt-1 max-w-56 text-sm text-neutral-500">{item.description}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
