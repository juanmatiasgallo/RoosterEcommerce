import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listUsers } from "@/lib/users/actions";
import { UsuariosClient } from "./usuarios-client";

// Consulta la DB: sin esto, el build de Docker en EasyPanel intenta
// pre-renderizarla en build time y falla (no tiene red hacia la base ahi).
export const dynamic = "force-dynamic";

/**
 * Refuerzo de guard a nivel de pagina (no solo en la Server Action ni en
 * que el sidebar la esconde): mismo criterio admin-only que
 * /admin/configuracion, mas estricto que el resto de /admin (que confia en
 * proxy.ts + el guard de cada action, ambos admin+empleado).
 */
export default async function UsuariosAdminPage() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    redirect("/");
  }

  const userList = await listUsers();

  return (
    <div className="mx-auto max-w-3xl">
      <UsuariosClient users={userList} />
    </div>
  );
}
