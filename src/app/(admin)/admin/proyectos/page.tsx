import { listProjectsAdmin } from "@/lib/projects/actions";
import { ProyectosClient } from "./proyectos-client";

// Consulta la DB: sin esto, el build de Docker en EasyPanel intenta
// pre-renderizarla en build time y falla (no tiene red hacia la base ahi).
export const dynamic = "force-dynamic";

/**
 * Proteccion de rol: src/proxy.ts ya redirige a no-staff lejos de /admin/*,
 * y cada Server Action en src/lib/projects/actions.ts vuelve a chequear el
 * rol (defensa en profundidad, mismo patron que /admin/categorias).
 */
export default async function ProyectosAdminPage() {
  const items = await listProjectsAdmin();

  return (
    <div className="mx-auto max-w-4xl">
      <ProyectosClient items={items} />
    </div>
  );
}
