"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const word = {
  hidden: { opacity: 0, y: "40%" },
  show: { opacity: 1, y: "0%", transition: { duration: 0.4, ease: "easeOut" as const } },
};

// Espacio entre palabras como nodo de texto SUELTO (no dentro del
// motion.span de la palabra) -- mismo bug/fix que animated-heading.tsx
// (task #32): un espacio como ultimo caracter dentro de un inline-block se
// colapsa, pegando las palabras entre si.
function renderWords(words: string[]): ReactNode[] {
  const nodes: ReactNode[] = [];
  words.forEach((w, index) => {
    if (w === "") return;
    nodes.push(
      <span key={`w-${index}`} className="inline-block overflow-hidden pb-0.5 align-bottom">
        <motion.span variants={word} className="inline-block">
          {w}
        </motion.span>
      </span>,
    );
    if (index < words.length - 1) {
      nodes.push(<span key={`sp-${index}`}> </span>);
    }
  });
  return nodes;
}

// Version liviana de AnimatedHeading para texto de cuerpo (parrafos,
// descripciones): palabra por palabra, sin la fuente de titulos ni el
// glow. Ritmo mas pausado (stagger mas largo que en los titulos) a
// proposito -- el owner pidio que el usuario tenga tiempo de leer sin
// apurarse, no solo un efecto decorativo rapido. `delay` sirve para
// encadenar despues de que termine la animacion del icono/titulo de la
// misma tarjeta (reveal en dos tiempos).
export function AnimatedParagraph({
  text,
  as = "p",
  className,
  delay = 0,
  stagger = 0.055,
}: {
  text: string;
  as?: "p" | "span";
  className?: string;
  delay?: number;
  stagger?: number;
}) {
  const words = text.split(" ");
  const MotionTag = as === "span" ? motion.span : motion.p;

  return (
    <MotionTag
      className={cn(className)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: false, amount: 0.6 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
    >
      {renderWords(words)}
    </MotionTag>
  );
}
