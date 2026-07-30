"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Patron fijo de tamanos/rotaciones (NO Math.random(): esto es un Client
// Component que se renderiza tanto en el server -- SSR de la primera carga
// -- como en el cliente al hidratar; un valor aleatorio distinto en cada
// lado rompe la hidratacion de React). Se repite en loop si la frase tiene
// mas letras que el patron. Los valores alternan chico/grande a proposito
// para que se note "disparejo" letra a letra, no una progresion prolija.
const SIZE_PATTERN = [0.55, 1.5, 0.75, 1.35, 0.6, 1.6, 0.85, 1.25, 0.65, 1.45, 0.7, 1.15];
const ROTATE_PATTERN = [-18, 14, -10, 20, -22, 9, -14, 17, -8, 12, -16, 10];

/**
 * Letra por letra "de forma dispareja" (algunas chicas, otras mas grandes)
 * que converge al final al tamano uniforme real del diseno -- el efecto se
 * logra animando `scale` (no font-size: mas fluido, no genera reflow en
 * cada frame) desde un valor variado por letra hasta 1 para todas.
 */
export function UnevenSettleText({
  text,
  className,
  delay = 0.45,
  stagger = 0.07,
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
}) {
  const letters = Array.from(text);

  return (
    <motion.span
      initial="hidden"
      whileInView="show"
      viewport={{ once: false, amount: 0.6 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
      className={cn("block", className)}
    >
      {letters.map((ch, i) => {
        if (ch === " ") return <span key={i}> </span>;
        const sizeFrom = SIZE_PATTERN[i % SIZE_PATTERN.length];
        const rotateFrom = ROTATE_PATTERN[i % ROTATE_PATTERN.length];
        return (
          <span key={i} className="inline-block pb-1 align-bottom">
            <motion.span
              className="inline-block"
              style={{ transformOrigin: "bottom" }}
              variants={{
                hidden: { scale: sizeFrom, rotate: rotateFrom, opacity: 0, y: "60%" },
                show: {
                  scale: 1,
                  rotate: 0,
                  opacity: 1,
                  y: "0%",
                  transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
                },
              }}
            >
              {ch}
            </motion.span>
          </span>
        );
      })}
    </motion.span>
  );
}
