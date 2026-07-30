"use client";

import { motion } from "framer-motion";
import { Extruded3DText } from "@/components/extruded-3d-text";
import { UnevenSettleText } from "@/components/uneven-settle-text";

// Mismo ritmo que el resto del Hero (task #34): stagger 0.09 entre letras,
// 0.85s por letra en asentarse.
const LETTER_STAGGER = 0.09;
const LETTER_DURATION = 0.85;
const IMPRESION = "Impresion";

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
 * Reemplaza el AnimatedHeading generico solo en el Hero: esta linea necesita
 * mezclar dos tratamientos que el componente compartido (usado en otras 13
 * pantallas del sitio) no soporta sin volverse mas fragil para todos los
 * demas usos -- "Impresion" se arma letra por letra como siempre, pero "3D"
 * pasa a ser una pieza aparte con relieve real (Extruded3DText), y la
 * segunda linea ("a tu medida") usa el armado disparejo->uniforme
 * (UnevenSettleText) en vez del reveal parejo de siempre.
 */
export function HeroHeading() {
  // La palabra "3D" entra apenas termina de asentarse la ultima letra de
  // "Impresion" (largo de la palabra * stagger + duracion de una letra).
  const threeDDelay = IMPRESION.length * LETTER_STAGGER + LETTER_DURATION * 0.55;

  return (
    <h1 className="relative mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">
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
        {renderLetters(IMPRESION)}
        <span> </span>
        <Extruded3DText delay={threeDDelay} />
      </motion.span>

      <UnevenSettleText text="a tu medida" className="text-accent" delay={0.45} />
    </h1>
  );
}
