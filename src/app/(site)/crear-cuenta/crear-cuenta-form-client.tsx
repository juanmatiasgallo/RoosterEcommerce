"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { z } from "zod";
import { registerSchema } from "@/lib/auth/schema";
import { registerUser } from "@/lib/auth/actions";
import { mergeGuestCartIntoUser } from "@/lib/cart/actions";

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

      router.push("/");
      router.refresh();
    } catch {
      router.push("/login");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium">
          Nombre
        </label>
        <input
          id="name"
          autoComplete="name"
          {...register("name")}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
      </div>

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
        <label htmlFor="password" className="mb-1 block text-sm font-medium">
          Contrasena
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium">
          Repetir contrasena
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register("confirmPassword")}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
      </div>

      {formError && (
        <p role="alert" className="text-sm text-red-600">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
      </button>

      <p className="text-sm text-neutral-500">
        ¿Ya tenes cuenta?{" "}
        <Link href="/login" className="underline">
          Inicia sesion
        </Link>
      </p>
    </form>
  );
}
