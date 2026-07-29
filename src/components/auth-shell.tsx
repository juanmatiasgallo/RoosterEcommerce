"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

// Fondo animado para login/crear-cuenta (a pedido del owner: "necesito que
// sea mucho mejor... con animacion y un fondo animado"). Tres glows
// difuminados que derivan lentamente en loop (Framer Motion) sobre
// neutral-950, mismo lenguaje visual que el Hero/Footer (full-bleed
// oscuro + acento cobre), pero en movimiento continuo en vez de estatico
// para que la pantalla de acceso se sienta mas "viva"/premium. La tarjeta
// del formulario entra con spring (fade + scale) al montar.
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
    <div className="relative left-1/2 right-1/2 -mx-[50vw] flex min-h-[75vh] w-screen items-center justify-center overflow-hidden bg-neutral-950 px-4 py-16">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-24 -left-20 h-80 w-80 rounded-full bg-accent/20 blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-accent/10 blur-3xl"
          animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        <motion.div
          className="absolute bottom-[-6rem] left-1/3 h-72 w-72 rounded-full bg-white/5 blur-3xl"
          animate={{ x: [0, 25, 0], y: [0, -20, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />
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
