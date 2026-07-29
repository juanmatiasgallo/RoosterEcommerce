"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/auth/actions";
import { forgotPasswordSchema } from "@/lib/auth/schema";

export function OlvidePasswordFormClient() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError("Ingresa un email valido.");
      return;
    }

    setIsSubmitting(true);
    try {
      await requestPasswordReset(parsed.data);
      // Mensaje generico siempre: no se filtra si el mail esta registrado
      // o no (mismo criterio que el login).
      setDone(true);
    } catch {
      setError("No se pudo procesar la solicitud, proba de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Si <span className="font-medium">{email}</span> esta registrado, te llega un mail con una contrasena
          temporal en los proximos minutos.
        </p>
        <Link href="/login" className="text-sm underline">
          Volver a iniciar sesion
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {isSubmitting ? "Enviando..." : "Enviar contrasena temporal"}
      </button>

      <Link href="/login" className="text-sm text-neutral-500 underline">
        Volver a iniciar sesion
      </Link>
    </form>
  );
}
