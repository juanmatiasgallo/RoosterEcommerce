"use client";

import { useId } from "react";
import { motion } from "framer-motion";

/**
 * Fondo ambiente para el TRAMO DEL MEDIO de la home (Como funciona, Value
 * props, Servicios, Tiempos de entrega, Material, Categorias destacadas) --
 * NO para toda la pagina. Se probo `fixed inset-0` cubriendo todo primero,
 * pero el owner lo corrigio: (1) se superponia con la grilla propia del
 * Hero (dos grillas pisandose ahi), y (2) no queria animacion desde
 * Catalogo en adelante, que tiene que quedar con el color de fondo natural,
 * sin nada de esto.
 *
 * Por eso ahora es `absolute inset-0` (no fixed): se monta DENTRO de un
 * wrapper `relative` que envuelve solo esas secciones del medio (ver
 * page.tsx), asi que su alto es exactamente el de ese tramo -- ni un pixel
 * mas, no llega ni al Hero (que ya tiene su propio fondo mas fuerte, ver
 * printer-grid-background.tsx) ni a Catalogo/Newsletter/Footer.
 *
 * El mask hace dos cosas: (a) funde el arranque rapido contra el final del
 * Hero (que ya se desvanece solo, no hace falta mucho aca) y (b) un cierre
 * largo e IRREGULAR contra Catalogo -- ademas del gradiente, unas manchas
 * difusas cerca del borde inferior se disuelven con timings distintos, para
 * que el corte se sienta organico y no una linea recta.
 */
export function AmbientSiteBackground() {
  const patternId = `ambient-hex-${useId()}`;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute inset-[-60px] opacity-[0.06] dark:opacity-[0.09]"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 68%, transparent 96%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 68%, transparent 96%)",
        }}
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

      {/* Cierre irregular contra Catalogo: 3 manchas que se disuelven
          (opacity 1->0) con timings distintos cerca del borde inferior --
          mismo truco que el "arranque" del Hero (ver
          printer-grid-background.tsx) pero al reves, y en la punta de
          abajo. */}
      {[
        { left: "22%", size: 200, delay: 0 },
        { left: "52%", size: 240, delay: 1 },
        { left: "78%", size: 160, delay: 2 },
      ].map((blob, index) => (
        <motion.div
          key={index}
          className="absolute bottom-0 -translate-x-1/2 translate-y-1/2 rounded-full bg-accent/[0.07] blur-2xl"
          style={{ left: blob.left, width: blob.size, height: blob.size }}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: [0, 0.8, 0], scale: [0.7, 1.2, 0.7] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: blob.delay }}
        />
      ))}

      {/* Mismo glow lento que antes, pero recorriendo solo este tramo. Todo
          en porcentajes (no vw/vh): este bloque ya no es full-bleed, su
          ancho real es el del contenido (max-w-6xl), no el viewport. */}
      <motion.div
        className="absolute h-[420px] w-[420px] rounded-full bg-accent/[0.05] blur-3xl"
        animate={{
          left: ["-6%", "60%", "25%", "-6%"],
          top: ["4%", "35%", "70%", "4%"],
        }}
        transition={{ duration: 38, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
