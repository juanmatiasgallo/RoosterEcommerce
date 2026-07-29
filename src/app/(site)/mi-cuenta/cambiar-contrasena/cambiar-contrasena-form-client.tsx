"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { changePassword } from "@/lib/auth/actions";
import { changePasswordSchema } from "@/lib/auth/schema";

const inputClass =
  "w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

export function CambiarContrasenaFormClient({ forced }: { forced: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = changePasswordSchema.safeParse({
      currentPassword: forced ? undefined : currentPassword,
      newPassword,
      confirmNewPassword,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los datos.");
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword(parsed.data);
      toast.success("Contrasena actualizada. Inicia sesion de nuevo con la nueva.");
      // La sesion (JWT) sigue marcando mustChangePassword=true hasta que se
      // vuelve a loguear (el token no se refresca solo contra la DB) — en
      // vez de lidiar con eso, se cierra sesion y se manda a /login, mismo
      // patron que "cambiaste tu contrasena" en la mayoria de los sitios.
      await signOut({ redirect: false });
      window.location.assign("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la contrasena.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {!forced && (
        <div>
          <label htmlFor="currentPassword" className="mb-1 block text-sm font-medium">
            Contrasena actual
          </label>
          <input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className={inputClass}
          />
        </div>
      )}

      <div>
        <label htmlFor="newPassword" className="mb-1 block text-sm font-medium">
          Contrasena nueva
        </label>
        <input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="confirmNewPassword" className="mb-1 block text-sm font-medium">
          Repetir contrasena nueva
        </label>
        <input
          id="confirmNewPassword"
          type="password"
          autoComplete="new-password"
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
          required
          className={inputClass}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {isSubmitting ? "Guardando..." : "Guardar contrasena"}
      </button>
    </form>
  );
}
