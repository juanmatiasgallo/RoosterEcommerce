"use client";

import Link from "next/link";
import { X } from "lucide-react";

// Se muestra una sola vez (ver markGuestFavoritesNoticeSeen en
// guest-favorites.ts), la primera vez que un visitante sin sesion marca un
// favorito — le avisa que eso queda guardado solo en ese navegador, y lo
// invita a crear cuenta para no perderlo.
export function GuestFavoritesModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Favoritos guardados en este navegador"
      onClick={onClose}
      className="animate-in fade-in-0 fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 duration-150"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="animate-in fade-in-0 zoom-in-95 relative w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-5 shadow-lg duration-150 dark:border-neutral-800 dark:bg-neutral-900"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
        >
          <X size={18} />
        </button>
        <h2 className="pr-6 text-base font-semibold">Guardado en este navegador</h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Como no iniciaste sesion, tus favoritos quedan guardados solo en este navegador. Si entras desde otro
          dispositivo o borras los datos de navegacion, se pierden.
        </p>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Crea una cuenta rapida para guardarlos en tu perfil y verlos desde donde quieras.
        </p>
        <div className="mt-4 flex gap-2">
          <Link
            href="/crear-cuenta"
            onClick={onClose}
            className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white active:scale-[0.98] dark:bg-neutral-100 dark:text-neutral-900"
          >
            Crear cuenta
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-neutral-300 px-4 py-2 text-sm active:scale-[0.98] dark:border-neutral-700"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
