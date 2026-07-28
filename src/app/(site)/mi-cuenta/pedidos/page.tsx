import { getMyCustomOrders } from "@/lib/custom-orders/actions";
import { PedidosClient } from "./pedidos-client";

// Consulta la DB directo (los pedidos del usuario logueado): sin esto, el
// build de Docker en EasyPanel la pre-renderiza en build time y falla (no
// tiene red hacia la base ahi).
export const dynamic = "force-dynamic";

/**
 * Requiere sesion, ya protegido en src/proxy.ts (/mi-cuenta/*), no se
 * duplica el chequeo aca. getMyCustomOrders() ademas vuelve a validar la
 * sesion internamente (defensa en profundidad, mismo patron que el resto
 * del proyecto).
 */
export default async function MiCuentaPedidosPage() {
  const orders = await getMyCustomOrders();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Mis pedidos a medida</h1>
      <PedidosClient orders={orders} />
    </main>
  );
}
