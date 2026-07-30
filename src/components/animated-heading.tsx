"use client";

import type { ElementType, ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const unit = {
  hidden: { y: "115%" },
  show: { y: "0%", transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
};

// Renderiza cada palabra/letra en su propia mascara animada, y el espacio
// entre palabras como un nodo de texto plano SUELTO entre esas mascaras
// (nunca adentro del motion.span). Bug encontrado en produccion (task #32):
// un espacio como ULTIMO caracter dentro de un <span inline-block> se
// colapsa (CSS trata el final de un inline-block atomico como el final de
// una linea, y recorta el whitespace ahi) -- por eso "Como funciona..."
// se veia como "Comofuncionaelpedidoamedida", pegado sin espacios. Sacar el
// espacio afuera de la mascara lo resuelve porque ahi es texto normal en el
// flujo del padre, no el borde de una caja atomica.
function renderUnits(units: string[], splitBy: "word" | "letter"): ReactNode[] {
  const nodes: ReactNode[] = [];
  units.forEach((u, index) => {
    if (u === "") return;
    if (u === " ") {
      // Los espacios (solo aparecen como unidad propia en splitBy="letter")
      // no necesitan mascara/animacion -- van directo como texto.
      nodes.push(<span key={`sp-${index}`}> </span>);
      return;
    }
    nodes.push(
      <span key={`u-${index}`} className="inline-block overflow-hidden pb-1 align-bottom">
        <motion.span variants={unit} className="inline-block">
          {u}
        </motion.span>
      </span>,
    );
    if (splitBy === "word" && index < units.length - 1) {
      nodes.push(<span key={`sp-${index}`}> </span>);
    }
  });
  return nodes;
}

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
  stagger,
}: {
  text: string | string[];
  as?: ElementType;
  className?: string;
  lineClassName?: string[];
  splitBy?: "word" | "letter";
  glow?: boolean;
  stagger?: number;
}) {
  const Tag = as;
  const lines = Array.isArray(text) ? text : [text];
  const staggerValue = stagger ?? (splitBy === "letter" ? 0.025 : 0.045);

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
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: staggerValue, delayChildren: lineIndex * 0.15 } },
            }}
            // "block" (no inline-block): cada entrada de `text` debe quedar
            // en su propio renglon -- con inline-block quedaban una al lado
            // de la otra sin espacio real entre ellas (bug task #32: el
            // Hero mostraba "Impresion 3Da tu medida" en una sola linea).
            className={cn("block", lineClassName?.[lineIndex])}
          >
            {renderUnits(units, splitBy)}
          </motion.span>
        );
      })}
    </Tag>
  );
}
