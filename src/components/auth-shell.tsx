"use client";

import { motion } from "framer-motion";
import { Box, Cog, Layers3, Ruler } from "lucide-react";
import type { ReactNode } from "react";

// Fondo animado para login/crear-cuenta (a pedido del owner, con una
// referencia visual propia: grilla + formas de linea flotando lento). Se
// tomo la idea general (grilla + iconos sueltos en movimiento) pero con
// paleta, tipografia e iconos propios del rubro (impresion 3D: cubo
// wireframe, capas, calibre, engranaje) en vez de calcar la referencia.
//
// Theme-aware (antes forzaba className="dark" sin importar el toggle del
// sitio -- el owner lo marco como "queda obsoleto/desactualizado" verlo
// siempre oscuro incluso con el sitio en modo claro). Ahora sigue el mismo
// criterio que el Hero: paleta clara/oscura segun el tema real, y sin un
// bloque de color propio (bg-[var(--background)], el mismo fondo que el
// resto de la pagina) para que no haya costura visible contra el header ni
// el footer -- la grilla, los iconos flotantes y el glow son los que le dan
// identidad, no un rectangulo de color distinto.
const FLOATING_ICONS = [
  { Icon: Box, className: "top-[14%] left-[10%] h-16 w-16 text-accent/40", duration: 9, delay: 0 },
  { Icon: Layers3, className: "top-[62%] left-[16%] h-12 w-12 text-neutral-900/10 dark:text-white/15", duration: 11, delay: 0.6 },
  { Icon: Ruler, className: "top-[22%] right-[14%] h-14 w-14 text-neutral-900/10 dark:text-white/15", duration: 10, delay: 1.1 },
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
    // Full-bleed + pantalla completa (mismo truco que el Hero, ver
    // hero.tsx): min-h-[calc(100dvh-4.5rem)] resta la altura del header
    // sticky, asi la pantalla de login ocupa todo lo visible en vez de
    // quedar como una caja chica en el medio.
    <div className="relative left-1/2 right-1/2 -mx-[50vw] flex min-h-[calc(100dvh-4.5rem)] w-screen items-center justify-center overflow-hidden bg-[var(--background)] px-4 py-16">
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
        className="relative w-full max-w-sm rounded-2xl border border-neutral-200 bg-white/70 p-7 shadow-2xl backdrop-blur-sm dark:border-white/10 dark:bg-neutral-950/60"
      >
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </motion.div>
    </div>
  );
}
