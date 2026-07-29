"use client";

import { motion } from "framer-motion";

// Fondo decorativo para las secciones de marca (Hero, Newsletter, banner de
// pedido a medida): grilla tipo plano tecnico/CAD que deriva lento en loop
// (evoca precision de impresion 3D) + una linea horizontal que barre la
// seccion de arriba a abajo, como una pasada de impresora depositando una
// capa. Usa color-mix() sobre --color-accent (no un hex fijo) para que el
// tono se adapte solo entre modo claro (cobre) y oscuro (celeste) sin
// duplicar el componente por tema. Reemplaza los blobs difuminados
// genericos que usabamos antes -- el owner pidio algo "relacionado a
// impresoras", no manchas de color sueltas.
export function PrinterGridBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-[-42px]"
        style={{
          backgroundImage:
            "linear-gradient(color-mix(in srgb, var(--color-accent) 16%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--color-accent) 16%, transparent) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
          // Pasaje entre secciones menos brusco (varios stops, no 2, para
          // que el degrade sea perceptualmente suave -- con solo 2 stops
          // sobre un fondo oscuro solido tuvimos banding visible una vez,
          // ver historial; aca el target es la grilla, ya mayormente
          // transparente, asi que el fade es mucho mas gradual). Cubre un
          // 40% de la seccion en cada punta en vez de cortar de golpe en el
          // borde.
          maskImage: "linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)",
        }}
        animate={{ backgroundPosition: ["0px 0px", "42px 42px"] }}
        transition={{ duration: 11, repeat: Infinity, ease: "linear" }}
      />
      {/* La linea de escaneo anima top Y opacity juntos: sin esto, el
          "salto" de vuelta al inicio del loop se nota (poca decoloracion en
          los extremos, reportado por el owner). Ahora se desvanece antes de
          llegar a cada punta y recien reaparece ya en movimiento, asi el
          reset del loop ocurre mientras es invisible. */}
      <motion.div
        className="absolute inset-x-0 h-28 bg-gradient-to-b from-transparent via-accent/25 to-transparent blur-md"
        initial={{ top: "-15%", opacity: 0 }}
        animate={{ top: ["-15%", "50%", "110%"], opacity: [0, 1, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.8, times: [0, 0.5, 1] }}
      />
    </div>
  );
}
