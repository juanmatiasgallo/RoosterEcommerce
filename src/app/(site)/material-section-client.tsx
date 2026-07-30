"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { SectionIntro } from "@/components/section-intro";
import type { MaterialRow } from "@/lib/site-content/actions";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.3, delayChildren: 0.15 } },
};

const column = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

const featureRow = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

const featureItem = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

const swatch = {
  hidden: { opacity: 0, scale: 0.5 },
  show: { opacity: 1, scale: 1, transition: { type: "spring" as const, stiffness: 260, damping: 20 } },
};

export function MaterialSectionClient({ material }: { material: MaterialRow }) {
  const features = material.features ?? [];
  const colors = material.colors ?? [];

  return (
    <section className="py-14">
      <SectionIntro eyebrow="Material" heading={material.name} subtitle={material.description} />

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.25 }}
        variants={container}
        className="mt-10 grid gap-10 sm:grid-cols-2"
      >
        {features.length > 0 && (
          <motion.div variants={column}>
            <motion.ul variants={featureRow} className="flex flex-col gap-2.5">
              {features.map((feature) => (
                <motion.li key={feature.text} variants={featureItem} className="flex items-start gap-2.5 text-sm">
                  {feature.positive ? (
                    <Check size={16} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <X size={16} className="mt-0.5 shrink-0 text-neutral-400" />
                  )}
                  <span className={feature.positive ? "text-neutral-700 dark:text-neutral-300" : "text-neutral-500"}>
                    {feature.text}
                  </span>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        )}

        {colors.length > 0 && (
          <motion.div variants={column}>
            <h3 className="font-heading text-sm font-medium">Colores disponibles</h3>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Trabajamos con {colors.length} colores estandar. ¿Necesitas otro? Consultanos.
            </p>
            <motion.div variants={featureRow} className="mt-4 flex flex-wrap gap-4">
              {colors.map((color) => (
                <motion.div key={color.name} variants={swatch} className="flex flex-col items-center gap-1.5">
                  <span
                    className="h-9 w-9 rounded-full border border-neutral-300 shadow-sm dark:border-neutral-700"
                    style={{ backgroundColor: color.hex }}
                    aria-hidden="true"
                  />
                  <span className="text-xs text-neutral-500">{color.name}</span>
                </motion.div>
              ))}
              <motion.div variants={swatch} className="flex flex-col items-center gap-1.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-neutral-300 text-neutral-400 dark:border-neutral-700">
                  +
                </span>
                <span className="text-xs text-neutral-500">Mas</span>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}
