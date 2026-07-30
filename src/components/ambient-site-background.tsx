"use client";

import { useId } from "react";
import { motion } from "framer-motion";

/**
 * Fondo ambiente para TODA la home, no solo Hero/Newsletter: se pidio que
 * las secciones "planas" del medio (Como funciona, Value props, Servicios,
 * Tiempos de entrega, Material) no se sientan "todo blanco" y que el fondo
 * "juegue un papel importante" -- pero sutil, no compitiendo con el
 * contenido.
 *
 * `fixed inset-0` (no absolute con una altura calculada a mano): cubre
 * siempre el viewport visible sea cual sea la altura real del documento, y
 * las secciones que SI tienen su propio fondo solido (Hero, Newsletter,
 * Footer -- todas con bg-[var(--background)] u opacas) lo tapan
 * automaticamente por estar despues en el flujo normal, sin tener que
 * coordinar tamanos/z-index a mano. Mismo lenguaje visual que
 * PrinterGridBackground (grilla hexagonal + esferas de acento) pero a una
 * opacidad mucho mas baja y con un solo glow grande que deriva muy lento
 * por toda la pantalla, para que "de a rato" haya movimiento visible sin
 * ser una animacion permanente que distraiga.
 */
export function AmbientSiteBackground() {
  const patternId = `ambient-hex-${useId()}`;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute inset-[-60px] opacity-[0.05] dark:opacity-[0.08]"
        animate={{ x: [0, 18, 0], y: [0, 14, 0] }}
        transition={{ duration: 34, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg aria-hidden="true" className="h-full w-full">
          <defs>
            <pattern id={patternId} width="44" height="76" patternUnits="userSpaceOnUse">
              <path
                d="M22 0 44 12.7 44 38 22 50.7 0 38 0 12.7Z"
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="1"
              />
              <path
                d="M22 50.7 44 63.3 44 88.7 22 101.3 0 88.7 0 63.3Z"
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${patternId})`} />
        </svg>
      </motion.div>

      {/* Un unico glow grande que recorre la pantalla entera muy lento (40s
          por vuelta): da la sensacion de "algo pasa de a rato" sin ser un
          efecto que se repite de forma obviamente ciclica cada pocos
          segundos. */}
      <motion.div
        className="absolute h-[520px] w-[520px] rounded-full bg-accent/[0.05] blur-3xl"
        animate={{
          left: ["-8vw", "55vw", "25vw", "-8vw"],
          top: ["8vh", "35vh", "78vh", "8vh"],
        }}
        transition={{ duration: 42, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
