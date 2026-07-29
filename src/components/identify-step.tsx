"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { checkEmailExists, registerUser } from "@/lib/auth/actions";
import { loginSchema, registerSchema } from "@/lib/auth/schema";
import { Spinner } from "@/components/ui/spinner";

export const identifyInputClass =
  "w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

// Paso de identificacion compartido entre wizards que necesitan una cuenta
// real antes de continuar (checkout, pedido a medida): pide el mail, y
// segun exista o no arma el login o el alta rapida (con telefono de
// contacto, que es justo lo que ambos flujos necesitan del cliente).
// Extraido de checkout-wizard.tsx para no duplicar esta logica.
export function IdentifyStep({
  onIdentified,
  title = "Identificacion de cuenta",
}: {
  onIdentified: (email: string) => void;
  title?: string;
}) {
  const [mode, setMode] = useState<"email" | "login" | "register">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  async function handleCheckEmail(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = loginSchema.shape.email.safeParse(email);
    if (!parsed.success) {
      setError("Ingresa un email valido.");
      return;
    }

    setIsChecking(true);
    try {
      const { exists } = await checkEmailExists(email);
      setMode(exists ? "login" : "register");
    } catch {
      setError("No se pudo verificar el email, proba de nuevo.");
    } finally {
      setIsChecking(false);
    }
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los datos.");
      return;
    }

    setIsChecking(true);
    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (!result || result.error) {
        setError("Email o contrasena incorrectos.");
        return;
      }
      onIdentified(email);
    } catch {
      setError("Email o contrasena incorrectos.");
    } finally {
      setIsChecking(false);
    }
  }

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = registerSchema.safeParse({ name, email, phone, password, confirmPassword, acceptTerms });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los datos.");
      return;
    }

    setIsChecking(true);
    try {
      await registerUser(parsed.data);
      const result = await signIn("credentials", { email, password, redirect: false });
      if (!result || result.error) {
        setError("La cuenta se creo pero no se pudo iniciar sesion. Proba desde /login.");
        return;
      }
      onIdentified(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta.");
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <div className="rounded border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="font-medium">{title}</h2>

      {mode === "email" && (
        <form onSubmit={handleCheckEmail} className="mt-3 flex flex-col gap-3">
          <div>
            <label htmlFor="identify-email" className="mb-1 block text-sm font-medium">
              Ingresa tu correo electronico
            </label>
            <input
              id="identify-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={identifyInputClass}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={isChecking}
            className="flex items-center justify-center gap-2 self-start rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white active:scale-[0.98] disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {isChecking && <Spinner size={14} />}
            {isChecking ? "Verificando..." : "Continuar"}
          </button>
        </form>
      )}

      {mode === "login" && (
        <form onSubmit={handleLogin} className="mt-3 flex flex-col gap-3">
          <p className="text-sm text-neutral-500">
            Ya tenes cuenta con <span className="font-medium">{email}</span>.
          </p>
          <div>
            <label htmlFor="identify-password" className="mb-1 block text-sm font-medium">
              Contrasena
            </label>
            <input
              id="identify-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={identifyInputClass}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isChecking}
              className="flex items-center justify-center gap-2 rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white active:scale-[0.98] disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
            >
              {isChecking && <Spinner size={14} />}
              {isChecking ? "Ingresando..." : "Ingresar"}
            </button>
            <button
              type="button"
              onClick={() => setMode("email")}
              className="rounded border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
            >
              Usar otro mail
            </button>
          </div>
        </form>
      )}

      {mode === "register" && (
        <form onSubmit={handleRegister} className="mt-3 flex flex-col gap-3">
          <p className="text-sm text-neutral-500">
            No encontramos una cuenta con <span className="font-medium">{email}</span>. Completa estos datos para
            crearla.
          </p>
          <div>
            <label htmlFor="identify-name" className="mb-1 block text-sm font-medium">
              Nombre
            </label>
            <input id="identify-name" value={name} onChange={(e) => setName(e.target.value)} required className={identifyInputClass} />
          </div>
          <div>
            <label htmlFor="identify-phone" className="mb-1 block text-sm font-medium">
              Celular de contacto
            </label>
            <input
              id="identify-phone"
              type="tel"
              placeholder="+598 99 000 000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className={identifyInputClass}
            />
          </div>
          <div>
            <label htmlFor="identify-new-password" className="mb-1 block text-sm font-medium">
              Contrasena
            </label>
            <input
              id="identify-new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={identifyInputClass}
            />
          </div>
          <div>
            <label htmlFor="identify-confirm-password" className="mb-1 block text-sm font-medium">
              Repetir contrasena
            </label>
            <input
              id="identify-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={identifyInputClass}
            />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
            />
            <span>
              Acepto los{" "}
              <Link href="/terminos-y-condiciones" target="_blank" className="underline">
                terminos y condiciones
              </Link>
              .
            </span>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isChecking}
              className="flex items-center justify-center gap-2 rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white active:scale-[0.98] disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
            >
              {isChecking && <Spinner size={14} />}
              {isChecking ? "Creando cuenta..." : "Crear cuenta y continuar"}
            </button>
            <button
              type="button"
              onClick={() => setMode("email")}
              className="rounded border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
            >
              Usar otro mail
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
