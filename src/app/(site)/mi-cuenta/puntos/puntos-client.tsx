"use client";

import { useState } from "react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { redeemLoyaltyPoints, type CouponRow, type LoyaltyPointRow } from "@/lib/loyalty/actions";
import { Spinner } from "@/components/ui/spinner";

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("es-UY", { year: "numeric", month: "short", day: "numeric" });
}

export function PuntosClient({
  initialBalance,
  initialHistory,
  initialCoupons,
  rates,
}: {
  initialBalance: number;
  initialHistory: LoyaltyPointRow[];
  initialCoupons: CouponRow[];
  rates: { loyaltyPointsPer100: number; loyaltyPointValue: number };
}) {
  const [balance, setBalance] = useState(initialBalance);
  const [history, setHistory] = useState(initialHistory);
  const [coupons, setCoupons] = useState(initialCoupons);
  const [pointsToRedeem, setPointsToRedeem] = useState(100);
  const [isRedeeming, setIsRedeeming] = useState(false);

  const isSystemActive = rates.loyaltyPointsPer100 > 0;
  const previewAmount = pointsToRedeem > 0 ? pointsToRedeem * rates.loyaltyPointValue : 0;
  const canRedeem = isSystemActive && pointsToRedeem > 0 && pointsToRedeem <= balance && rates.loyaltyPointValue > 0;

  async function handleRedeem() {
    setIsRedeeming(true);
    try {
      const coupon = await redeemLoyaltyPoints({ points: pointsToRedeem });
      setCoupons((prev) => [coupon, ...prev]);
      setBalance((prev) => prev - pointsToRedeem);
      setHistory((prev) => [
        {
          id: coupon.id,
          storeId: coupon.storeId,
          userId: coupon.userId,
          orderId: null,
          type: "redeemed",
          points: pointsToRedeem,
          note: `Canjeado por cupon ${coupon.code}`,
          createdAt: coupon.createdAt,
        },
        ...prev,
      ]);
      toast.success(`Cupon ${coupon.code} generado por ${formatCurrency(Number(coupon.amount))}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo canjear los puntos.");
    } finally {
      setIsRedeeming(false);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="rounded border border-neutral-200 p-4 dark:border-neutral-800">
        <p className="text-sm text-neutral-500">Saldo disponible</p>
        <p className="text-3xl font-semibold">{balance} pts</p>
        {isSystemActive ? (
          <p className="mt-1 text-xs text-neutral-500">
            Ganas {rates.loyaltyPointsPer100} puntos por cada $100 en compras confirmadas. 1 punto ={" "}
            {formatCurrency(rates.loyaltyPointValue)} de descuento al canjear.
          </p>
        ) : (
          <p className="mt-1 text-xs text-neutral-500">El sistema de puntos no esta activo por ahora.</p>
        )}
      </div>

      {isSystemActive && (
        <div className="rounded border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="font-medium">Canjear puntos por un cupon</p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="points-to-redeem" className="mb-1 block text-sm font-medium">
                Puntos a canjear
              </label>
              <input
                id="points-to-redeem"
                type="number"
                min={1}
                max={balance}
                value={pointsToRedeem}
                onChange={(e) => setPointsToRedeem(Math.max(0, Number(e.target.value) || 0))}
                className="w-32 rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </div>
            <p className="text-sm text-neutral-500">Equivale a {formatCurrency(previewAmount)} de descuento.</p>
            <button
              type="button"
              onClick={handleRedeem}
              disabled={!canRedeem || isRedeeming}
              className="flex items-center justify-center gap-2 rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
            >
              {isRedeeming && <Spinner size={14} />}
              {isRedeeming ? "Canjeando..." : "Canjear"}
            </button>
          </div>
          {pointsToRedeem > balance && (
            <p className="mt-2 text-xs text-red-600">No tenes suficientes puntos para ese canje.</p>
          )}
        </div>
      )}

      {coupons.length > 0 && (
        <div className="rounded border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="font-medium">Cupones disponibles</p>
          <p className="mt-1 text-xs text-neutral-500">Elegilos en el paso de pago del checkout.</p>
          <ul className="mt-3 flex flex-col gap-2">
            {coupons.map((coupon) => (
              <li key={coupon.id} className="flex items-center justify-between gap-3 text-sm">
                <code className="rounded bg-neutral-100 px-2 py-1 text-xs dark:bg-neutral-800">{coupon.code}</code>
                <span className="text-neutral-500">{formatCurrency(Number(coupon.amount))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded border border-neutral-200 p-4 dark:border-neutral-800">
        <p className="font-medium">Historial</p>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">Todavia no tenes movimientos de puntos.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {history.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <p>{row.type === "earned" ? "Puntos ganados" : "Puntos canjeados"}</p>
                  <p className="text-xs text-neutral-500">
                    {formatDate(row.createdAt)}
                    {row.note ? ` · ${row.note}` : ""}
                  </p>
                </div>
                <span className={row.type === "earned" ? "text-green-700 dark:text-green-400" : "text-neutral-500"}>
                  {row.type === "earned" ? "+" : "-"}
                  {row.points}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
