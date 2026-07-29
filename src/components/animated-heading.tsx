"use client";

import type { ElementType } from "react";
import { motion } from "framer-motion";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045 } },
};

const word = {
  hidden: { y: "115%" },
  show: { y: "0%", transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
};

// Titulos con "vida" (task #20): el owner pidio que las fuentes y letras
// tengan movimiento en vez de aparecer estaticas. En lugar de animar TODO
// el texto del sitio (arriesgado, rompe layouts/tests), este componente se
// aplica puntualmente a los titulos de mayor impacto (Hero, secciones
// principales de la home, banner de pedido a medida): cada palabra entra
// deslizandose hacia arriba desde su propia mascara (overflow-hidden), en
// cascada, disparado por scroll (whileInView, once) para que se sienta
// secuencial y no un parpadeo unico al cargar.
export function AnimatedHeading({
  text,
  as = "h2",
  className,
}: {
  text: string;
  as?: ElementType;
  className?: string;
}) {
  const Tag = as;
  const words = text.split(" ");

  return (
    <Tag className={className}>
      <motion.span
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.6 }}
        variants={container}
        className="inline"
      >
        {words.map((w, index) => (
          <span key={`${w}-${index}`} className="inline-block overflow-hidden pb-1 align-bottom">
            <motion.span variants={word} className="inline-block">
              {w}
              {index < words.length - 1 ? " " : ""}
            </motion.span>
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}
