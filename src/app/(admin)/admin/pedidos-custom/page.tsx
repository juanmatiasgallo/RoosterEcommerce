import { db } from "@/lib/db";
import { customOrders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function PedidosCustomAdminPage() {
  const pendientes = await db
    .select()
    .from(customOrders)
    .where(eq(customOrders.status, "pendiente"));

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Pedidos a medida por cotizar</h1>
      <ul>
        {pendientes.map((o) => (
          <li key={o.id}>
            {o.fileName} — cantidad: {o.quantity} — {o.material ?? "sin especificar"}
          </li>
        ))}
      </ul>
      {/* TODO: modal/form para poner quotedPrice y pasar status a "cotizado" */}
    </main>
  );
}
