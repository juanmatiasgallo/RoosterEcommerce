"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

// Toggle claro/oscuro (task #121): antes del mount no sabemos el tema real
// (next-themes lo resuelve del lado del cliente para evitar flash), por eso
// se renderiza un placeholder del mismo tamano hasta que "mounted" sea true
// -- evita el salto de layout y el mismatch de hidratacion.
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <span className="flex h-5 w-5" aria-hidden="true" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="flex items-center text-neutral-500 transition-colors hover:text-accent dark:text-neutral-400"
    >
      {isDark ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
    </button>
  );
}
