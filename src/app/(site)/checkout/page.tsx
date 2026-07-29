import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCartItems } from "@/lib/cart/actions";
import { getAvailableManualPaymentMethods, getDefaultShippingAddress, getMyLastPaymentMethod } from "@/lib/orders/actions";
import { listActiveShippingZones } from "@/lib/shipping/actions";
import { getDefaultStoreId } from "@/lib/db/store";
import { getVacationStatus } from "@/lib/settings/actions";
import { CheckoutWizard } from "./checkout-wizard";

// Consulta la DB: sin esto, el build de Docker en EasyPanel la pre-renderiza
// en build time y falla (no tiene red hacia la base ahi).
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const storeId = await getDefaultStoreId();
  const [{ items, total }, session, manualPaymentMethods, shippingZones, vacation, defaultShipping, lastPaymentMethod] =
    await Promise.all([
      getCartItems(),
      auth(),
      getAvailableManualPaymentMethods(storeId),
      listActiveShippingZones(),
      getVacationStatus(),
      getDefaultShippingAddress(),
      getMyLastPaymentMethod(),
    ]);

  if (items.length === 0) redirect("/carrito");

  if (vacation.vacationMode) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Finalizar compra</h1>
        <p className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          {vacation.vacationMessage || "La tienda no esta recibiendo pedidos en este momento."}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Finalizar compra</h1>

      <div className="mt-6">
        <CheckoutWizard
          initialItems={items}
          initialTotal={total}
          initialUserEmail={session?.user.email ?? null}
          initialShippingAddress={defaultShipping.address}
          initialShippingZoneId={defaultShipping.shippingZoneId}
          initialPaymentMethod={lastPaymentMethod}
          manualPaymentMethods={manualPaymentMethods}
          shippingZones={shippingZones.map((zone) => ({
            id: zone.id,
            name: zone.name,
            description: zone.description,
            cost: zone.cost,
          }))}
        />
      </div>
    </main>
  );
}
