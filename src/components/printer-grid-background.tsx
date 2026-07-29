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
        }}
        animate={{ backgroundPosition: ["0px 0px", "42px 42px"] }}
        transition={{ duration: 11, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute inset-x-0 h-28 bg-gradient-to-b from-transparent via-accent/25 to-transparent blur-md"
        initial={{ top: "-15%" }}
        animate={{ top: ["-15%", "110%"] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.8 }}
      />
    </div>
  );
}
