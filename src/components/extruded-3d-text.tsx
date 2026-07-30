"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Relieve/extrusion tipografica con CSS puro: N capas de text-shadow
// escalonadas en diagonal, oscureciendo hacia el fondo (color-mix con
// negro), que simulan un lateral solido debajo de la letra -- la misma
// tecnica que se usa en logos "3D" hechos solo con CSS. Deliberadamente NO
// se uso un modelo 3D real (Three.js/WebGL): se pregunto y se eligio esta
// opcion porque CLAUDE.md pide evitar sumar dependencias pesadas al
// proyecto sin justificarlo, y esto da un resultado con bastante impacto
// sin sumar ni un KB de dependencia nueva.
const DEPTH_LAYERS = 9;

function buildExtrudeShadow() {
  return Array.from({ length: DEPTH_LAYERS }, (_, i) => {
    const offset = i + 1;
    const mix = Math.max(15, 100 - i * 10);
    return `${offset}px ${offset}px 0 color-mix(in srgb, var(--color-accent) ${mix}%, black)`;
  }).join(", ");
}

const EXTRUDE_SHADOW = buildExtrudeShadow();

/**
 * La palabra "3D" del Hero, con relieve real (no solo el mismo texto en
 * otro color): pop-in con rebote leve al aparecer, y despues una rotacion
 * 3D continua y suave (rotateY/rotateX en loop infinito) que deja ver la
 * profundidad de las capas -- el "buen impacto visual" que se pidio.
 */
export function Extruded3DText({
  text = "3D",
  className,
  delay = 1.4,
}: {
  text?: string;
  className?: string;
  delay?: number;
}) {
  return (
    // Sin initial/animate propios: hereda "hidden"/"show" del motion.span
    // padre en hero-heading.tsx (que ya maneja whileInView con once:false),
    // asi el pop-in de "3D" replica exactamente cuando "Impresion" replica
    // -- si tuviera su propio ciclo de vida (initial+animate) solo jugaria
    // una vez al montar y nunca de nuevo al reaparecer en pantalla.
    <motion.span
      className={cn("inline-block", className)}
      style={{ perspective: "700px" }}
      variants={{
        hidden: { opacity: 0, scale: 0.4, y: 14 },
        show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.65, delay, ease: [0.34, 1.56, 0.64, 1] } },
      }}
    >
      {/* Motion span anidado: el de afuera hace el pop-in una sola vez, este
          de adentro arranca su propio loop infinito de rotacion recien
          cuando el pop-in ya termino (delay = delay del padre + su
          duracion), para que no se pisen las dos animaciones. */}
      <motion.span
        className="inline-block font-heading font-black text-accent"
        style={{ textShadow: EXTRUDE_SHADOW, transformStyle: "preserve-3d" }}
        animate={{ rotateY: [-14, 14, -14], rotateX: [3, -3, 3] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: delay + 0.65 }}
      >
        {text}
      </motion.span>
    </motion.span>
  );
}
