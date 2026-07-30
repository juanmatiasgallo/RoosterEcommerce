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
const DEPTH_LAYERS = 11;

function buildExtrudeShadow() {
  return Array.from({ length: DEPTH_LAYERS }, (_, i) => {
    const offset = i + 1;
    const mix = Math.max(12, 100 - i * 9);
    return `${offset}px ${offset}px 0 color-mix(in srgb, var(--color-accent) ${mix}%, black)`;
  }).join(", ");
}

const EXTRUDE_SHADOW = buildExtrudeShadow();

/**
 * La palabra "3D" del Hero, con relieve real (no solo el mismo texto en
 * otro color): mucho mas grande que el resto del titulo (text-[2.2em], en
 * proporcion al tamano del h1 en cada breakpoint, no un valor fijo), pop-in
 * con rebote al aparecer, glow pulsante detras para que tenga presencia
 * propia, y una rotacion 3D continua bastante mas amplia que antes que deja
 * ver la profundidad de las capas -- "mucha mas animacion" pedido
 * explicitamente.
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
      // z-0 (no solo "relative"): sin un z-index explicito, position:relative
      // no crea un stacking context propio, y el z-index negativo del glow
      // de abajo terminaria escapando a un ancestro mas arriba en vez de
      // quedar detras del texto de ESTE componente -- pudiendo quedar tapado
      // por el fondo de la pagina entera (invisible). Con z-0 aca, el -z-10
      // del glow queda contenido ahi.
      className={cn("relative z-0 inline-block align-bottom", className)}
      style={{ perspective: "700px" }}
      variants={{
        hidden: { opacity: 0, scale: 0.3, y: 20 },
        show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.7, delay, ease: [0.34, 1.56, 0.64, 1] } },
      }}
    >
      {/* Glow detras: dos capas difusas pulsando en loop con timings
          distintos, mas grandes que el texto -- le dan presencia de
          "protagonista" a la palabra, no solo el relieve de las letras. */}
      <motion.span
        aria-hidden="true"
        className="absolute inset-[-30%] -z-10 rounded-full bg-accent/20 blur-3xl"
        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.75, 0.4] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: delay + 0.4 }}
      />
      <motion.span
        aria-hidden="true"
        className="absolute inset-[-15%] -z-10 rounded-full bg-accent/25 blur-xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: delay + 0.7 }}
      />

      {/* Motion span anidado: el de afuera hace el pop-in una sola vez, este
          de adentro arranca su propio loop infinito de rotacion/pulso recien
          cuando el pop-in ya termino (delay = delay del padre + su
          duracion), para que no se pisen las dos animaciones. Tamano en em
          (no un valor fijo en px/rem): 2.2x el tamano del texto que lo
          rodea, en cualquier breakpoint, sin duplicar clases sm:/md:. */}
      <motion.span
        className="inline-block font-heading font-black text-accent"
        style={{ fontSize: "2.2em", lineHeight: 1, textShadow: EXTRUDE_SHADOW, transformStyle: "preserve-3d" }}
        animate={{ rotateY: [-28, 28, -28], rotateX: [10, -10, 10], scale: [1, 1.08, 1] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: delay + 0.7 }}
      >
        {text}
      </motion.span>
    </motion.span>
  );
}
