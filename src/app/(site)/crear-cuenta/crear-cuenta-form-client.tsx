"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import type { z } from "zod";
import { registerSchema } from "@/lib/auth/schema";
import { registerUser } from "@/lib/auth/actions";
import { mergeGuestCartIntoUser } from "@/lib/cart/actions";
import { mergeGuestFavoritesIntoUser } from "@/lib/favorites/actions";
import { getGuestFavoriteIds, clearGuestFavorites } from "@/lib/favorites/guest-favorites";
import { Spinner } from "@/components/ui/spinner";

// Le da tiempo al toast de exito a alcanzar a pintarse antes de que
// window.location.assign corte el documento actual (un reload inmediato
// no garantiza que el usuario llegue a verlo).
const REDIRECT_DELAY_MS = 600;

type FormValues = z.infer<typeof registerSchema>;

export function CrearCuentaFormClient() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(values: FormValues) {
    setFormError(null);

    try {
      await registerUser(values);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No se pudo crear la cuenta.");
      return;
    }

    try {
      // Mismo mecanismo que login-form-client.tsx: redirect:false para
      // poder manejar el resultado sin depender de la pagina de error
      // generica de next-auth.
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (!result || result.error) {
        // La cuenta ya se creo bien; si el login automatico falla por algun
        // motivo raro, no lo dejamos colgado en un formulario roto.
        router.push("/login");
        return;
      }

      // Fusiona el carrito de invitado (si armo uno antes de registrarse)
      // con la cuenta recien creada.
      await mergeGuestCartIntoUser();

      try {
        const guestFavoriteIds = getGuestFavoriteIds();
        if (guestFavoriteIds.length > 0) {
          await mergeGuestFavoritesIntoUser(guestFavoriteIds);
          clearGuestFavorites();
        }
      } catch {
        // no-op
      }

      toast.success("Cuenta creada correctamente");

      // window.location.assign (recarga completa) en vez de
      // router.push+refresh: mismo fix que login-form-client.tsx, evita
      // depender del cache de Server Components de Next despues de un
      // signIn con redirect:false. El registro siempre crea "cliente", asi
      // que el destino es fijo ("/"), sin logica de rol.
      // El pequeno delay le da tiempo al toast de arriba a alcanzar a
      // pintarse antes de que el reload corte el documento actual.
      setTimeout(() => window.location.assign("/"), REDIRECT_DELAY_MS);
    } catch {
      router.push("/login");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-neutral-600 dark:text-neutral-300">
          Nombre
        </label>
        <input
          id="name"
          autoComplete="name"
          {...register("name")}
          className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder:text-neutral-500"
        />
        {errors.name && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-neutral-600 dark:text-neutral-300">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register("email")}
          className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder:text-neutral-500"
        />
        {errors.email && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="phone" className="mb-1 block text-sm font-medium text-neutral-600 dark:text-neutral-300">
          Celular de contacto
        </label>
        <input
          id="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+598 99 000 000"
          {...register("phone")}
          className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder:text-neutral-500"
        />
        {errors.phone && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.phone.message}</p>}
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-neutral-600 dark:text-neutral-300">
          Contrasena
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
          className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder:text-neutral-500"
        />
        {errors.password && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.password.message}</p>}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-neutral-600 dark:text-neutral-300">
          Repetir contrasena
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register("confirmPassword")}
          className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder:text-neutral-500"
        />
        {errors.confirmPassword && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.confirmPassword.message}</p>}
      </div>

      <div>
        <label className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-300">
          <input type="checkbox" className="mt-0.5" {...register("acceptTerms")} />
          <span>
            Acepto los{" "}
            <Link href="/terminos-y-condiciones" target="_blank" className="text-accent underline hover:text-neutral-900 dark:hover:text-white">
              terminos y condiciones
            </Link>
            .
          </span>
        </label>
        {errors.acceptTerms && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.acceptTerms.message}</p>}
      </div>

      {formError && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex items-center justify-center gap-2 rounded bg-accent px-4 py-2 text-sm font-medium text-accent-foreground active:scale-[0.98] disabled:opacity-50 hover:bg-accent-hover"
      >
        {isSubmitting && <Spinner size={14} />}
        {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
      </button>

      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        ¿Ya tenes cuenta?{" "}
        <Link href="/login" className="text-accent underline hover:text-neutral-900 dark:hover:text-white">
          Inicia sesion
        </Link>
      </p>
    </form>
  );
}
