"use client";

import { motion } from "framer-motion";
import { Box, Cog, Layers3, Ruler } from "lucide-react";
import type { ReactNode } from "react";

// Fondo animado para login/crear-cuenta (a pedido del owner, con una
// referencia visual propia: grilla + formas de linea flotando lento). Se
// tomo la idea general (grilla + iconos sueltos en movimiento) pero con
// paleta, tipografia e iconos propios del rubro (impresion 3D: cubo
// wireframe, capas, calibre, engranaje) en vez de calcar la referencia.
// className="dark" fuerza el tema oscuro en este bloque sin importar el
// toggle del sitio -- el login es una pantalla de marca aparte, como en la
// referencia, no debe cambiar de paleta con el modo claro/oscuro del resto.
const FLOATING_ICONS = [
  { Icon: Box, className: "top-[14%] left-[10%] h-16 w-16 text-accent/40", duration: 9, delay: 0 },
  { Icon: Layers3, className: "top-[62%] left-[16%] h-12 w-12 text-white/15", duration: 11, delay: 0.6 },
  { Icon: Ruler, className: "top-[22%] right-[14%] h-14 w-14 text-white/15", duration: 10, delay: 1.1 },
  { Icon: Cog, className: "bottom-[12%] right-[20%] h-20 w-20 text-accent/25", duration: 13, delay: 0.3 },
];

function HexGrid() {
  return (
    <svg aria-hidden="true" className="absolute inset-0 h-full w-full opacity-[0.15]">
      <defs>
        <pattern id="auth-hex" width="44" height="76" patternUnits="userSpaceOnUse" patternTransform="scale(1)">
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
      <rect width="100%" height="100%" fill="url(#auth-hex)" />
    </svg>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="dark relative left-1/2 right-1/2 -mx-[50vw] flex min-h-[75vh] w-screen items-center justify-center overflow-hidden bg-neutral-950 px-4 py-16">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ x: [0, 14, 0], y: [0, 10, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <HexGrid />
        </motion.div>

        <div className="absolute top-1/2 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl" />

        {FLOATING_ICONS.map(({ Icon, className, duration, delay }, index) => (
          <motion.div
            key={index}
            className={`absolute ${className}`}
            animate={{ y: [0, -14, 0], rotate: [0, 4, 0] }}
            transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}
          >
            <Icon strokeWidth={1.25} className="h-full w-full" />
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-950/60 p-7 shadow-2xl backdrop-blur-sm"
      >
        <h1 className="text-xl font-semibold text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-neutral-400">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </motion.div>
    </div>
  );
}
