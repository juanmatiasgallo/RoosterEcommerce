import { listProductsForAdmin } from "@/lib/catalog/actions";
import { listCategoryTree } from "@/lib/catalog/queries";
import { ProductosClient } from "./productos-client";

// Consulta la DB: sin esto, el build de Docker en EasyPanel la pre-renderiza
// en build time y falla (no tiene red hacia la base ahi).
export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Proteccion de rol: src/proxy.ts ya redirige a no-staff lejos de /admin/*,
 * y listProductsForAdmin + cada Server Action de src/lib/catalog/actions.ts
 * vuelven a chequear el rol (defensa en profundidad, mismo patron que
 * /admin/categorias y /admin/pedidos-custom).
 */
export default async function ProductosAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const search = firstValue(sp.q);

  const [productList, categoryTree] = await Promise.all([listProductsForAdmin(search), listCategoryTree()]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <ProductosClient products={productList} categoryTree={categoryTree} initialSearch={search ?? ""} />
    </main>
  );
}
