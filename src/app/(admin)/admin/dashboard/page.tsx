import Link from "next/link";
import { listProductsForAdmin } from "@/lib/catalog/actions";
import { listCategoryTree } from "@/lib/catalog/queries";
import { listCustomOrdersForAdmin } from "@/lib/custom-orders/actions";
import { listOrdersForAdmin } from "@/lib/orders/actions";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("es-UY", { year: "numeric", month: "short", day: "numeric" });
}

// Consulta la DB: sin esto, el build de Docker en EasyPanel la
// pre-renderiza en build time y falla (no tiene red hacia la base ahi).
export const dynamic = "force-dynamic";

// Umbral de "stock bajo" para el aviso del dashboard. Constante nombrada en
// vez de un numero suelto: con el catalogo chico de hoy, 3 unidades o menos
// por variante es un disparador razonable de "pedile mas al proveedor".
const LOW_STOCK_THRESHOLD = 3;

function countCategories(nodes: Awaited<ReturnType<typeof listCategoryTree>>): number {
  return nodes.reduce((sum, node) => sum + 1 + countCategories(node.children), 0);
}

/**
 * Todo lo que se muestra sale de funciones que ya existen (listProductsForAdmin,
 * listCustomOrdersForAdmin, listCategoryTree) — no se agrego ninguna query
 * nueva, solo se derivan los numeros del dashboard sobre esos mismos datos.
 * Proteccion de rol: src/proxy.ts + el requireStaff() interno de cada una de
 * esas funciones (defensa en profundidad, mismo patron que el resto de /admin).
 */
export default async function AdminDashboardPage() {
  const [products, customOrders, categoryTree, orders] = await Promise.all([
    listProductsForAdmin(),
    listCustomOrdersForAdmin(),
    listCategoryTree(),
    listOrdersForAdmin(),
  ]);

  const activeProducts = products.filter((product) => product.active);
  const pendientesCotizar = customOrders.filter((order) => order.status === "pendiente");
  const cotizadosEsperandoPago = customOrders.filter((order) => order.status === "cotizado");
  const totalCategorias = countCategories(categoryTree);

  const lowStockRows = activeProducts.flatMap((product) =>
    product.variants
      .filter((variant) => variant.active && variant.stock <= LOW_STOCK_THRESHOLD)
      .map((variant) => ({ product, variant })),
  );

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold">Panel admin</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Link href="/admin/pedidos-custom">
          <Card className="h-full transition hover:border-accent hover:shadow-md">
            <CardContent>
              <p className="text-3xl font-semibold">{pendientesCotizar.length}</p>
              <p className="mt-1 text-sm text-neutral-500">Pedidos por cotizar</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/productos">
          <Card className="h-full transition hover:border-accent hover:shadow-md">
            <CardContent>
              <p className="text-3xl font-semibold">{activeProducts.length}</p>
              <p className="mt-1 text-sm text-neutral-500">Productos activos</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/categorias">
          <Card className="h-full transition hover:border-accent hover:shadow-md">
            <CardContent>
              <p className="text-3xl font-semibold">{totalCategorias}</p>
              <p className="mt-1 text-sm text-neutral-500">Categorias</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/pedidos-custom">
          <Card className="h-full transition hover:border-accent hover:shadow-md">
            <CardContent>
              <p className="text-3xl font-semibold">{cotizadosEsperandoPago.length}</p>
              <p className="mt-1 text-sm text-neutral-500">Cotizados esperando pago</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Productos con stock bajo</h2>
          <Link href="/admin/productos" className="text-sm text-accent hover:underline">
            Ir a productos
          </Link>
        </div>

        {lowStockRows.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">
            Ninguna variante activa esta en o por debajo de {LOW_STOCK_THRESHOLD} unidades.
          </p>
        ) : (
          <Card className="mt-4">
            <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {lowStockRows.map(({ product, variant }) => (
                <li
                  key={variant.id}
                  className="flex items-center justify-between gap-2 p-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                >
                  <div>
                    <CardTitle className="text-sm">{product.name}</CardTitle>
                    <p className="text-xs text-neutral-500">
                      {[variant.material, variant.color, variant.size].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <Badge variant={variant.stock === 0 ? "danger" : "warning"}>
                    {variant.stock === 0 ? "Sin stock" : `${variant.stock} unidades`}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Ordenes recientes</h2>
          <Link href="/admin/pedidos" className="text-sm text-accent hover:underline">
            Ver todas
          </Link>
        </div>

        {orders.length === 0 ? (
          <Card className="mt-4">
            <CardContent>
              <p className="text-sm text-neutral-500">Todavia no hay ordenes pagadas.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="mt-4">
            <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {orders.slice(0, 5).map((row) => (
                <li
                  key={row.order.id}
                  className="flex items-center justify-between gap-2 p-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                >
                  <div>
                    <CardTitle className="text-sm">{row.customerName ?? row.customerEmail}</CardTitle>
                    <p className="text-xs text-neutral-500">{formatDate(row.order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{formatCurrency(Number(row.order.total))}</span>
                    <Badge variant={row.order.status === "entregado" ? "success" : "info"}>{row.order.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
