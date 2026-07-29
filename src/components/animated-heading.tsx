"use client";

import type { ElementType } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const unit = {
  hidden: { y: "115%" },
  show: { y: "0%", transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
};

// Titulos con "vida" (task #20, reforzado en task #23): cada palabra (o
// letra, ver splitBy) entra deslizandose hacia arriba desde su propia
// mascara (overflow-hidden), en cascada, disparado por scroll (whileInView,
// once) para que se sienta secuencial. `text` acepta un array para titulos
// de mas de una linea con estilos distintos por linea (ej. Hero: primera
// linea neutra, segunda en el color de acento) -- todo dentro de un unico
// tag semantico (un solo <h1> real, no varios).
export function AnimatedHeading({
  text,
  as = "h2",
  className,
  lineClassName,
  splitBy = "word",
  glow = false,
}: {
  text: string | string[];
  as?: ElementType;
  className?: string;
  lineClassName?: string[];
  splitBy?: "word" | "letter";
  glow?: boolean;
}) {
  const Tag = as;
  const lines = Array.isArray(text) ? text : [text];
  const stagger = splitBy === "letter" ? 0.025 : 0.045;

  return (
    <Tag className={cn("font-heading relative", className)}>
      {glow && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 scale-150 rounded-full bg-accent/25 blur-3xl"
        />
      )}
      {lines.map((line, lineIndex) => {
        const units = splitBy === "letter" ? Array.from(line) : line.split(" ");
        return (
          <motion.span
            key={`${line}-${lineIndex}`}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.6 }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: lineIndex * 0.15 } } }}
            className={cn("inline-block", lineClassName?.[lineIndex])}
          >
            {units.map((u, index) => (
              <span key={`${u}-${index}`} className="inline-block overflow-hidden pb-1 align-bottom">
                <motion.span variants={unit} className="inline-block">
                  {u === " " ? " " : u}
                  {splitBy === "word" && index < units.length - 1 ? " " : ""}
                </motion.span>
              </span>
            ))}
          </motion.span>
        );
      })}
    </Tag>
  );
}
