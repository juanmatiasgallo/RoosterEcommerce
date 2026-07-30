"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

// variant="icon" (task #125): version compacta para los headers de sidebar
// (admin y cliente), donde "Cerrar sesion" ahora vive arriba junto al logo
// en vez de al pie del sidebar (habia que scrollear para llegar).
export function LogoutButton({ variant = "text" }: { variant?: "text" | "icon" }) {
  // callbackUrl: "/" fuerza el destino sin importar el rol ni desde que
  // ruta se dispare (incluso /admin/*): siempre termina en el home publico.
  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        title="Cerrar sesion"
        aria-label="Cerrar sesion"
        className="flex items-center text-neutral-500 transition-colors hover:text-accent dark:text-neutral-400"
      >
        <LogOut size={18} strokeWidth={1.75} />
      </button>
    );
  }

  // Variante "text" (menu del header, desktop y mobile): icono + tinte rojo
  // al hover en vez de texto subrayado piso -- lectura mas clara de "esto es
  // una accion distinta a navegar" (mismo lenguaje que un logout en
  // cualquier app conocida), sin llegar a un boton solido rojo que se sienta
  // alarmante para algo tan comun.
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400"
    >
      <LogOut size={15} strokeWidth={1.75} />
      Cerrar sesion
    </button>
  );
}
