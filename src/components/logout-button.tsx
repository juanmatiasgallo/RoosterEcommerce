"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    // callbackUrl: "/" fuerza el destino sin importar el rol ni desde que
    // ruta se dispare (incluso /admin/*): siempre termina en el home publico.
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="text-sm text-neutral-500 underline hover:text-accent"
    >
      Cerrar sesion
    </button>
  );
}
