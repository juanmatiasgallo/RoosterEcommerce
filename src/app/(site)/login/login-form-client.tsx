"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getSession, signIn } from "next-auth/react";
import Link from "next/link";
import type { z } from "zod";
import { loginSchema } from "@/lib/auth/schema";
import { mergeGuestCartIntoUser } from "@/lib/cart/actions";
import { mergeGuestFavoritesIntoUser } from "@/lib/favorites/actions";
import { getGuestFavoriteIds, clearGuestFavorites } from "@/lib/favorites/guest-favorites";
import { Spinner } from "@/components/ui/spinner";

type FormValues = z.infer<typeof loginSchema>;

export function LoginFormClient({ callbackUrl }: { callbackUrl: string }) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: FormValues) {
    setFormError(null);

    try {
      // redirect: false para poder mostrar el error inline en vez de navegar
      // a una pagina de error generica de next-auth.
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (!result || result.error) {
        // Mensaje generico a proposito: no distingue "no existe el email" de
        // "contrasena incorrecta" para no filtrar que emails estan registrados.
        setFormError("Email o contrasena incorrectos.");
        return;
      }

      // Fusiona el carrito de invitado (si existia cookie cart_guest_id) con
      // el usuario recien logueado, antes de navegar. Se llama siempre; la
      // action misma no hace nada si no hay cookie de invitado.
      await mergeGuestCartIntoUser();

      // Mismo momento para fusionar los favoritos guardados en localStorage
      // como invitado (ver guest-favorites.ts) — no bloquea el login si
      // falla, es solo una comodidad.
      try {
        const guestFavoriteIds = getGuestFavoriteIds();
        if (guestFavoriteIds.length > 0) {
          await mergeGuestFavoritesIntoUser(guestFavoriteIds);
          clearGuestFavorites();
        }
      } catch {
        // no-op
      }

      // El resultado de signIn no trae el rol: se pide la sesion recien
      // creada para decidir el destino. admin/empleado van siempre a su
      // panel (ignorando el callbackUrl de un cliente que hubiera estado
      // navegando antes de loguearse); cliente respeta el callbackUrl ya
      // sanitizado en page.tsx.
      const session = await getSession();
      const role = session?.user.role;
      const target = role === "admin" || role === "empleado" ? "/admin/dashboard" : callbackUrl;

      // window.location.assign (recarga completa) en vez de
      // router.push+refresh: en el VPS se confirmo que router.push despues
      // de un signIn con redirect:false a veces no navega aunque la sesion
      // ya haya quedado creada (problema conocido de next-auth + cache de
      // Server Components en algunos entornos) — un reload completo evita
      // depender de ese cache.
      window.location.assign(target);
    } catch {
      setFormError("Email o contrasena incorrectos.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register("email")}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="password" className="block text-sm font-medium">
            Contrasena
          </label>
          <Link href="/olvide-password" className="text-xs text-neutral-500 underline">
            Olvide mi contrasena
          </Link>
        </div>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register("password")}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
      </div>

      {formError && (
        <p role="alert" className="text-sm text-red-600">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex items-center justify-center gap-2 rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white active:scale-[0.98] disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {isSubmitting && <Spinner size={14} />}
        {isSubmitting ? "Ingresando..." : "Ingresar"}
      </button>

      <p className="text-sm text-neutral-500">
        ¿No tenes cuenta?{" "}
        <Link href="/crear-cuenta" className="underline">
          Crea una
        </Link>
      </p>
    </form>
  );
}
