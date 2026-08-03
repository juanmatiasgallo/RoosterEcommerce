import Link from "next/link";
import { getMyOrders } from "@/lib/orders/actions";
import { ComprasClient } from "./compras-client";

// Consulta la DB directo (las compras del usuario logueado): sin esto, el
// build de Docker en EasyPanel la pre-renderiza en build time y falla (no
// tiene red hacia la base ahi) — mismo criterio que /mi-cuenta/pedidos.
export const dynamic = "force-dynamic";

/**
 * Requiere sesion, ya protegido en src/proxy.ts (/mi-cuenta/*). Muestra las
 * compras de catalogo del usuario logueado (source = "catalogo"), separado
 * de /mi-cuenta/pedidos que es solo pedidos a medida — ver task #88/#91.
 * El listado en si (con paginacion, task #146) vive en compras-client.tsx.
 */
export default async function MiCuentaComprasPage() {
  const orders = await getMyOrders();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Mis compras</h1>
      <p className="mt-1 text-neutral-500">Historial de tus compras del catalogo.</p>

      {orders.length === 0 ? (
        <p className="mt-6 text-neutral-500">
          Todavia no tenes compras.{" "}
          <Link href="/#catalogo" className="underline">
            Ver catalogo
          </Link>
          .
        </p>
      ) : (
        <ComprasClient orders={orders} />
      )}
    </div>
  );
}
