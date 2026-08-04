"use client";

import { motion } from "framer-motion";
import { UnevenSettleText } from "@/components/uneven-settle-text";

// Mismo ritmo que el resto del Hero (task #34): stagger 0.09 entre letras,
// 0.85s por letra en asentarse.
const LETTER_STAGGER = 0.09;
const LETTER_DURATION = 0.85;
const FIRST_LINE = "De la idea al objeto";

const letterUnit = {
  hidden: { y: "115%" },
  show: { y: "0%", transition: { duration: LETTER_DURATION, ease: [0.22, 1, 0.36, 1] as const } },
};

function renderLetters(word: string) {
  return Array.from(word).map((ch, i) => (
    <span key={i} className="inline-block overflow-hidden pb-1 align-bottom">
      <motion.span variants={letterUnit} className="inline-block">
        {ch}
      </motion.span>
    </span>
  ));
}

/**
 * Reemplaza el AnimatedHeading generico solo en el Hero: "De la idea al
 * objeto" se arma letra por letra, y la segunda linea ("y mucho mas") usa
 * el armado disparejo->uniforme (UnevenSettleText) en vez del reveal parejo
 * de siempre.
 *
 * Antes tenia ademas la pieza "3D" incrustada al final de la primera linea
 * (Extruded3DText). El owner pidio sacar tanto la pieza-bola del Hero como
 * las letras "3D" sueltas del titulo, y unificar todo en una sola pieza con
 * forma literal de "3D" -- esa pieza ahora vive sola, arriba de este
 * titulo, no aca (ver hero.tsx).
 */
export function HeroHeading() {
  return (
    <h1 className="relative mt-3 text-5xl font-semibold tracking-tight sm:text-7xl">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 scale-150 rounded-full bg-accent/25 blur-3xl"
      />

      <motion.span
        initial="hidden"
        whileInView="show"
        viewport={{ once: false, amount: 0.6 }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: LETTER_STAGGER } } }}
        className="block"
      >
        {renderLetters(FIRST_LINE)}
      </motion.span>

      <UnevenSettleText text="y mucho mas" className="text-accent" delay={0.45} />
    </h1>
  );
}
