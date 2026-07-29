import type { Metadata } from "next";
import { OlvidePasswordFormClient } from "./olvide-password-form-client";

export const metadata: Metadata = {
  title: "Olvide mi contrasena",
  description: "Recupera el acceso a tu cuenta de Tienda 3D.",
};

export default function OlvidePasswordPage() {
  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <h1 className="text-2xl font-semibold">Olvide mi contrasena</h1>
      <p className="mt-1 text-neutral-500">
        Te mandamos una contrasena temporal por mail, valida por 24 horas. Al entrar con ella te vamos a pedir que
        elijas una definitiva.
      </p>

      <div className="mt-6">
        <OlvidePasswordFormClient />
      </div>
    </main>
  );
}
