import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSmtpSettings } from "@/lib/settings/actions";
import { ConfiguracionClient } from "./configuracion-client";

// Consulta la DB: sin esto, el build de Docker en EasyPanel la
// pre-renderiza en build time y falla (no tiene red hacia la base ahi).
export const dynamic = "force-dynamic";

/**
 * Refuerzo de guard a nivel de pagina, no solo en la Server Action: a
 * diferencia del resto de /admin (que confia en proxy.ts + el guard de
 * cada action, ambos admin+empleado), esta pagina expone configuracion de
 * credenciales SMTP reales — admin-only estricto — asi que se chequea el
 * rol aca tambien de forma explicita. proxy.ts deja pasar a "empleado" a
 * cualquier /admin/*, por eso este chequeo extra es el que realmente lo
 * frena en esta pagina puntual.
 */
export default async function ConfiguracionAdminPage() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    redirect("/");
  }

  const settings = await getSmtpSettings();

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Configuracion SMTP</h1>
      <p className="mt-1 text-neutral-500">
        Se usa para enviar notificaciones por email. La contrasena queda encriptada en la base, nunca en texto
        plano.
      </p>

      <div className="mt-6">
        <ConfiguracionClient initial={settings} />
      </div>
    </main>
  );
}
