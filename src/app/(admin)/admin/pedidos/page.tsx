import { listOrdersForAdmin } from "@/lib/orders/actions";
import { PedidosClient } from "./pedidos-client";

// Consulta la DB: sin esto, el build de Docker en EasyPanel la pre-renderiza
// en build time y falla (no tiene red hacia la base ahi).
export const dynamic = "force-dynamic";

/**
 * Proteccion de rol: src/proxy.ts ya redirige a no-staff lejos de /admin/*,
 * y listOrdersForAdmin/updateOrderStatus vuelven a chequear el rol (defensa
 * en profundidad, mismo patron que el resto de /admin).
 */
export default async function PedidosAdminPage() {
  const orders = await listOrdersForAdmin();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">Pedidos</h1>
      <p className="mt-1 text-neutral-500">Ordenes pagadas, listas para preparar y enviar.</p>

      <div className="mt-6">
        <PedidosClient orders={orders} />
      </div>
    </div>
  );
}
