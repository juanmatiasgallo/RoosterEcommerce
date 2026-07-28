import { listCustomOrdersForAdmin } from "@/lib/custom-orders/actions";
import { PedidosCustomClient } from "./pedidos-custom-client";

// Consulta la DB: sin esto, el build de Docker en EasyPanel la pre-renderiza
// en build time y falla (no tiene red hacia la base ahi).
export const dynamic = "force-dynamic";

/**
 * Proteccion de rol: src/proxy.ts ya redirige a no-staff lejos de /admin/*,
 * y listCustomOrdersForAdmin/quoteCustomOrder vuelven a chequear el rol
 * (defensa en profundidad, mismo patron que el resto de /admin).
 */
export default async function PedidosCustomAdminPage() {
  const orders = await listCustomOrdersForAdmin();
  const pendientes = orders.filter((order) => order.status === "pendiente");
  const cotizados = orders.filter((order) => order.status === "cotizado");

  return (
    <div className="mx-auto max-w-3xl">
      <PedidosCustomClient pendientes={pendientes} cotizados={cotizados} />
    </div>
  );
}
