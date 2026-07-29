import type { Metadata } from "next";
import { auth } from "@/auth";
import { CambiarContrasenaFormClient } from "./cambiar-contrasena-form-client";

export const metadata: Metadata = {
  title: "Cambiar contrasena",
};

// proxy.ts ya redirige aca a cualquier usuario con mustChangePassword=true
// (entro con una temporal) y bloquea el resto del sitio hasta que la
// cambie — esta pagina tambien sirve para un cambio voluntario normal.
export default async function CambiarContrasenaPage() {
  const session = await auth();
  const forced = session?.user.mustChangePassword ?? false;

  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <h1 className="text-2xl font-semibold">Cambiar contrasena</h1>
      <p className="mt-1 text-neutral-500">
        {forced
          ? "Entraste con una contrasena temporal. Elegi una definitiva para seguir."
          : "Cambia tu contrasena cuando quieras."}
      </p>

      <div className="mt-6">
        <CambiarContrasenaFormClient forced={forced} />
      </div>
    </main>
  );
}
