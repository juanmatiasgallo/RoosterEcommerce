"use client";

import { useId } from "react";
import { motion } from "framer-motion";

// Fondo decorativo para las secciones de marca (Hero, Newsletter, banner de
// pedido a medida, Proyectos): grilla hexagonal (mismo patron que el fondo
// del login, ver auth-shell.tsx > HexGrid, para que las "pantallas de
// marca" del sitio compartan un lenguaje visual) con un par de destellos
// que recorren el patron en diagonal, simulando una corriente circulando
// por el circuito. Reemplaza la grilla cuadrada anterior -- el owner pidio
// que el borde donde termina sea practicamente imperceptible, asi que el
// fade ahora cubre el 30% de la altura en cada punta (antes 22%) y el
// patron en si es mucho mas organico que lineas rectas.
const SPARKS = [
  { top: "10%", left: "14%", dx: 130, dy: 240, duration: 6, delay: 0 },
  { top: "55%", left: "70%", dx: -150, dy: 210, duration: 7.5, delay: 1.6 },
  { top: "24%", left: "84%", dx: -100, dy: 280, duration: 8.5, delay: 3.2 },
  { top: "70%", left: "26%", dx: 110, dy: -200, duration: 7, delay: 4.5 },
];

function HexGrid({ patternId }: { patternId: string }) {
  return (
    <svg aria-hidden="true" className="absolute inset-0 h-full w-full opacity-[0.18]">
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
  );
}

export function PrinterGridBackground() {
  // Id unico por instancia (useId): si esta seccion llega a renderizarse
  // dos veces en la misma pagina, cada SVG tiene su propio <pattern>, sin
  // ids duplicados (invalido en HTML, aunque hoy no rompe nada porque el
  // contenido es identico en todas las instancias).
  const patternId = `storefront-hex-${useId()}`;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-[-42px]"
        style={{
          // Fade grande y con varios stops (evita el banding que vimos con
          // un mask-image de 2 stops sobre un fondo solido oscuro -- aca el
          // target es la grilla, ya mayormente transparente, asi que el
          // degrade es mucho mas suave). 30%/70% = 60% de la seccion
          // desvaneciendo hacia cada punta, para que no se note donde
          // termina.
          maskImage: "linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%)",
        }}
        animate={{ x: [0, 14, 0], y: [0, 10, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      >
        <HexGrid patternId={patternId} />
      </motion.div>

      {/* "Corriente" (task #27): chispitas que viajan en diagonal por
          encima de la grilla, entrando y saliendo de la nada (opacity
          0->1->0) para que nunca se note un corte -- dan la sensacion de un
          circuito con actividad en vez de un patron estatico. */}
      {SPARKS.map((spark, index) => (
        <motion.span
          key={index}
          className="absolute h-1.5 w-1.5 rounded-full bg-accent"
          style={{ top: spark.top, left: spark.left, boxShadow: "0 0 10px 2px var(--color-accent)" }}
          animate={{ x: [0, spark.dx, 0], y: [0, spark.dy, 0], opacity: [0, 1, 0] }}
          transition={{
            duration: spark.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: spark.delay,
            times: [0, 0.5, 1],
          }}
        />
      ))}

      {/* Barrido de arriba a abajo -- antes se veia como una mancha/franja
          sucia cruzando toda la seccion (opacidad y blur insuficientes para
          la saturacion del acento en claro). Ahora: mucha menos opacidad de
          base, blur bastante mas grande (deja de ser una linea con borde
          definido) y un mask radial que ademas lo apaga hacia los costados,
          asi no es una franja de punta a punta sino un brillo ambiente que
          flota por el centro. */}
      <motion.div
        className="absolute inset-x-0 h-40 bg-gradient-to-b from-transparent via-accent/8 to-transparent blur-2xl"
        style={{
          maskImage: "radial-gradient(ellipse 55% 100% at 50% 50%, black 35%, transparent 90%)",
          WebkitMaskImage: "radial-gradient(ellipse 55% 100% at 50% 50%, black 35%, transparent 90%)",
        }}
        initial={{ top: "-20%", opacity: 0 }}
        animate={{ top: ["-20%", "50%", "120%"], opacity: [0, 0.7, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", repeatDelay: 2.4, times: [0, 0.5, 1] }}
      />
    </div>
  );
}
