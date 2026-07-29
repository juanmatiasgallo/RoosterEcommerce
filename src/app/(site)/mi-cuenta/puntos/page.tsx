import { getMyLoyaltyBalance, getMyLoyaltyHistory, getMyCoupons } from "@/lib/loyalty/actions";
import { getPublicLoyaltyRates } from "@/lib/settings/actions";
import { PuntosClient } from "./puntos-client";

// Consulta la DB directo (puntos del usuario logueado): mismo criterio que
// el resto de /mi-cuenta/*, sin esto el build de Docker en EasyPanel intenta
// pre-renderizarla en build time y falla.
export const dynamic = "force-dynamic";

export default async function MiCuentaPuntosPage() {
  const [balance, history, coupons, rates] = await Promise.all([
    getMyLoyaltyBalance(),
    getMyLoyaltyHistory(),
    getMyCoupons(),
    getPublicLoyaltyRates(),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Mis puntos</h1>
      <p className="mt-1 text-neutral-500">
        Ganas puntos con cada compra confirmada y los podes canjear por un cupon de descuento para tu proxima
        compra.
      </p>

      <PuntosClient initialBalance={balance} initialHistory={history} initialCoupons={coupons} rates={rates} />
    </div>
  );
}
