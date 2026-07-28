import { listCategoryTree } from "@/lib/catalog/queries";
import { CategoriasClient } from "./categorias-client";

// Consulta la DB: sin esto, el build de Docker en EasyPanel intenta
// pre-renderizarla en build time y falla (no tiene red hacia la base ahi).
export const dynamic = "force-dynamic";

/**
 * Proteccion de rol: src/proxy.ts ya redirige a no-staff lejos de /admin/*,
 * y cada Server Action en src/lib/catalog/actions.ts vuelve a chequear el rol
 * (defensa en profundidad, mismo patron que /admin/pedidos-custom).
 */
export default async function CategoriasAdminPage() {
  const categoryTree = await listCategoryTree();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <CategoriasClient categoryTree={categoryTree} />
    </main>
  );
}
