"use client";

import type { CSSProperties } from "react";
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

type Material = {
  name: string;
  // Uno de los dos: fill (color solido, via `color`) o gradient (acabado
  // con brillo, via background-clip:text). shadowBase es el color base que
  // arma las capas de profundidad (color-mix hacia negro) -- para el
  // gradiente se usa un tono intermedio representativo, ya que
  // text-shadow no puede degradar color el mismo.
  fill?: string;
  gradient?: string;
  shadowBase: string;
};

// Ciclo de "materiales de impresion" (pedido explicito: el relieve solido
// de un solo color se sentia plano -- "mas textura... que vaya cambiando de
// texturas"). Tres acabados que rotan solos, tematicamente ligados a la
// seccion de Materiales que ya existe en la home: plastico/acento (el
// original), metalico plateado, y cobre (ligado a la paleta "Carbon y
// cobre" del sitio, con mas presencia en modo oscuro donde el acento no es
// cobre sino celeste).
const MATERIALS: Material[] = [
  { name: "plastico", fill: "var(--color-accent)", shadowBase: "var(--color-accent)" },
  {
    name: "metal",
    gradient: "linear-gradient(135deg, #eef0f3 0%, #ffffff 22%, #8f96a3 48%, #c7cbd4 70%, #eef0f3 100%)",
    shadowBase: "#7d8492",
  },
  {
    name: "cobre",
    gradient: "linear-gradient(135deg, #f2b27a 0%, #ffd9ad 20%, #8a4a1f 50%, #d9834f 75%, #f2b27a 100%)",
    shadowBase: "#a85a2c",
  },
];

// Cuanto dura cada material visible (incluye su propio fade in/out) --
// el ciclo completo es MATERIAL_DURATION * MATERIALS.length.
const MATERIAL_DURATION = 5;

function buildExtrudeShadow(base: string) {
  return Array.from({ length: DEPTH_LAYERS }, (_, i) => {
    const offset = i + 1;
    const mix = Math.max(12, 100 - i * 9);
    return `${offset}px ${offset}px 0 color-mix(in srgb, ${base} ${mix}%, black)`;
  }).join(", ");
}

// Estilo via inline style solo para lo que varia por material (imagen de
// fondo, sombra, color solido) -- el recorte del gradiente al texto usa las
// utilidades de Tailwind (bg-clip-text text-transparent) en vez de
// backgroundClip/-webkit-backgroundClip en el style object, para no
// depender de que csstype tipe "text" como valor valido de background-clip.
function materialStyle(material: Material): CSSProperties {
  const textShadow = buildExtrudeShadow(material.shadowBase);
  if (material.gradient) {
    return { backgroundImage: material.gradient, textShadow };
  }
  return { color: material.fill, textShadow };
}

/**
 * La palabra "3D" del Hero, con relieve real (no solo el mismo texto en
 * otro color): mucho mas grande que el resto del titulo (text-[2.2em], en
 * proporcion al tamano del h1 en cada breakpoint, no un valor fijo), pop-in
 * con rebote al aparecer, glow pulsante detras para que tenga presencia
 * propia, y una rotacion 3D continua bastante mas amplia que antes que deja
 * ver la profundidad de las capas -- "mucha mas animacion" pedido
 * explicitamente. Ahora ademas el relieve en si va rotando entre 3
 * "materiales" (ver MATERIALS arriba) via crossfade de opacity -- 3 copias
 * del texto apiladas exactamente una encima de otra (mismo font/tamano, asi
 * que coinciden pixel a pixel), solo una visible a la vez.
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
          rodea, en cualquier breakpoint, sin duplicar clases sm:/md:. La
          rotacion se aplica ACA (al contenedor), no a cada copia de
          material de abajo -- asi las 3 giran como un solo objeto rigido,
          sin importar cual esta visible en un momento dado. */}
      <motion.span
        className="relative inline-block font-heading font-black"
        style={{ fontSize: "2.2em", lineHeight: 1, transformStyle: "preserve-3d" }}
        animate={{ rotateY: [-28, 28, -28], rotateX: [10, -10, 10], scale: [1, 1.08, 1] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: delay + 0.7 }}
      >
        {MATERIALS.map((material, index) => (
          <motion.span
            key={material.name}
            aria-hidden={index > 0 ? "true" : undefined}
            className={cn(index > 0 && "absolute inset-0", material.gradient && "bg-clip-text text-transparent")}
            style={materialStyle(material)}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{
              duration: MATERIAL_DURATION,
              repeat: Infinity,
              delay: delay + 0.7 + index * MATERIAL_DURATION,
              repeatDelay: (MATERIALS.length - 1) * MATERIAL_DURATION,
              times: [0, 0.15, 0.85, 1],
              ease: "easeInOut",
            }}
          >
            {text}
          </motion.span>
        ))}
      </motion.span>
    </motion.span>
  );
}
