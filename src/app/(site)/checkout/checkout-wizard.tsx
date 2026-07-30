"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { getCartItems, mergeGuestCartIntoUser, type CartRow } from "@/lib/cart/actions";
import { checkoutCart, uploadPaymentReceipt } from "@/lib/orders/actions";
import { shippingAddressSchema, type ShippingAddress } from "@/lib/orders/schema";
import { getMyCoupons, type CouponRow } from "@/lib/loyalty/actions";
import { previewDiscountCode } from "@/lib/discount-campaigns/actions";
import { mergeGuestFavoritesIntoUser } from "@/lib/favorites/actions";
import { getGuestFavoriteIds, clearGuestFavorites } from "@/lib/favorites/guest-favorites";
import type { PaymentMethod } from "@/lib/orders/actions";
import { getReceiptView } from "@/lib/receipt/actions";
import {
  PaymentMethodPicker,
  type ManualPaymentMethodOption,
  type PaymentMethodValue,
} from "@/components/payment-method-picker";
import { Spinner } from "@/components/ui/spinner";
import { PostPurchaseFollow } from "@/components/post-purchase-follow";
import { IdentifyStep } from "@/components/identify-step";
import { OrderReceiptCard, type OrderReceiptCardProps } from "@/components/order-receipt-card";

type ShippingZoneOption = { id: string; name: string; description: string | null; cost: string };
type Step = 1 | 2 | 3 | 4;
type ManualResult = {
  orderId: string;
  orderNumber: number;
  methodLabel: string;
  instructions: string;
  receiptEligible: boolean;
};

const STEP_LABELS: Record<Step, string> = {
  1: "Identificacion",
  2: "Envio",
  3: "Pago",
  4: "Confirmacion",
};

const inputClass =
  "w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

// Pagina de checkout de 4 pasos (referencia: sitios de ecommerce
// uruguayos conocidos). A diferencia del carrito viejo, esto permite armar
// el pedido sin cuenta y recien identificarse/crear la cuenta en el paso 1
// — el carrito de invitado (cookie) se fusiona con la cuenta apenas se
// identifica, antes de seguir a los pasos siguientes.
//
// Ojo: nunca se pide numero de tarjeta aca. Para Mercado Pago seguimos
// redirigiendo a su Checkout Pro (hosted, PCI-compliant del lado de MP) —
// meter un formulario de tarjeta propio implicaria manejar datos de pago
// crudos en nuestro servidor, que es exactamente lo que CLAUDE.md prohibe.
export function CheckoutWizard({
  initialItems,
  initialTotal,
  initialUserEmail,
  initialShippingAddress = null,
  initialShippingZoneId = null,
  initialPaymentMethod = null,
  instagramUrl = null,
  facebookUrl = null,
  whatsappHref = null,
  manualPaymentMethods,
  shippingZones,
}: {
  initialItems: CartRow[];
  initialTotal: number;
  initialUserEmail: string | null;
  initialShippingAddress?: ShippingAddress | null;
  initialShippingZoneId?: string | null;
  initialPaymentMethod?: PaymentMethod | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  whatsappHref?: string | null;
  manualPaymentMethods: ManualPaymentMethodOption[];
  shippingZones: ShippingZoneOption[];
}) {
  const startedLoggedIn = Boolean(initialUserEmail);
  const [step, setStep] = useState<Step>(startedLoggedIn ? 2 : 1);
  const [items, setItems] = useState(initialItems);
  const [subtotal, setSubtotal] = useState(initialTotal);
  const [identifiedEmail, setIdentifiedEmail] = useState(initialUserEmail);

  // Precarga la direccion/zona de la ultima compra del cliente (si tiene
  // una guardada) para que no arranque de cero cada vez — ver
  // getDefaultShippingAddress en lib/orders/actions.ts.
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(initialShippingAddress);
  const [shippingZone, setShippingZone] = useState<ShippingZoneOption | null>(
    () => shippingZones.find((zone) => zone.id === initialShippingZoneId) ?? null,
  );

  // Precarga el medio de pago de la ultima compra exitosa (ver
  // getMyLastPaymentMethod en lib/orders/actions.ts), mismo criterio que la
  // direccion de envio de arriba — si nunca compro, arranca en Mercado Pago.
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodValue>(initialPaymentMethod ?? "mercado_pago");

  // Cupones de puntos (ver /mi-cuenta/puntos): solo tiene sentido buscarlos
  // una vez identificado (getMyCoupons devuelve vacio sin sesion). Se
  // eligen del listado, no se tipean a mano, para evitar errores de
  // tipeo/codigos ajenos.
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [selectedCouponCode, setSelectedCouponCode] = useState<string | null>(null);

  // Codigo de promocion general (backlog "sistema de ofertas/descuentos"):
  // texto libre + boton "Aplicar" (previewDiscountCode revalida contra el
  // carrito real del server), a diferencia del cupon de puntos de arriba
  // que se elige de un listado. Mutuamente excluyente con el cupon de
  // puntos -- elegir uno limpia el otro, ver los dos handlers abajo.
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    type: "percent" | "fixed";
    value: number;
    discountAmount: number;
  } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [manualResult, setManualResult] = useState<ManualResult | null>(null);

  const shippingCost = shippingZone ? Number(shippingZone.cost) : 0;
  const selectedCoupon = coupons.find((c) => c.code === selectedCouponCode) ?? null;
  const discountAmount = selectedCoupon
    ? Math.min(Number(selectedCoupon.amount), subtotal)
    : appliedPromo
      ? Math.min(appliedPromo.discountAmount, subtotal)
      : 0;
  const discountLabel = selectedCoupon ? "Descuento (cupon de puntos)" : "Descuento (codigo de promocion)";
  const total = Math.max(0, subtotal - discountAmount) + shippingCost;

  function handleSelectCoupon(code: string | null) {
    setSelectedCouponCode(code);
    if (code) {
      setAppliedPromo(null);
      setPromoError(null);
    }
  }

  async function handleApplyPromo() {
    setPromoError(null);
    setIsApplyingPromo(true);
    try {
      const result = await previewDiscountCode(promoCodeInput);
      setAppliedPromo(result);
      setSelectedCouponCode(null);
    } catch (error) {
      setAppliedPromo(null);
      setPromoError(error instanceof Error ? error.message : "No se pudo aplicar el codigo.");
    } finally {
      setIsApplyingPromo(false);
    }
  }

  function handleClearPromo() {
    setAppliedPromo(null);
    setPromoCodeInput("");
    setPromoError(null);
  }

  useEffect(() => {
    if (!startedLoggedIn) return;
    getMyCoupons()
      .then(setCoupons)
      .catch(() => {
        // no-op: el checkout sigue andando sin cupones si esto falla
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleIdentified(email: string) {
    try {
      await mergeGuestCartIntoUser();
      const fresh = await getCartItems();
      setItems(fresh.items);
      setSubtotal(fresh.total);
    } catch {
      // Si la fusion del carrito falla, seguimos con lo que ya teniamos
      // (los items de invitado siguen en la DB, no se pierden) — no vale
      // la pena bloquear el checkout por esto.
    }
    try {
      setCoupons(await getMyCoupons());
    } catch {
      // no-op
    }
    try {
      const guestFavoriteIds = getGuestFavoriteIds();
      if (guestFavoriteIds.length > 0) {
        await mergeGuestFavoritesIntoUser(guestFavoriteIds);
        clearGuestFavorites();
      }
    } catch {
      // no-op
    }
    setIdentifiedEmail(email);
    setStep(2);
  }

  async function handleFinalize() {
    setIsSubmittingOrder(true);
    try {
      const result = await checkoutCart({
        paymentMethod,
        shippingZoneId: shippingZone?.id,
        shippingAddress: shippingAddress ?? undefined,
        couponCode: selectedCouponCode ?? undefined,
        promoCode: appliedPromo?.code ?? undefined,
      });
      if (result.type === "manual") {
        setManualResult(result);
        return;
      }
      // Recarga completa: sale del SPA hacia el Checkout Pro de Mercado
      // Pago, no hay nada que preservar del cache de Next del lado de aca.
      window.location.assign(result.initPoint);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo finalizar la compra.");
    } finally {
      setIsSubmittingOrder(false);
    }
  }

  if (manualResult) {
    return (
      <ManualOrderResult
        manualResult={manualResult}
        instagramUrl={instagramUrl}
        facebookUrl={facebookUrl}
        whatsappHref={whatsappHref}
      />
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-4">
        <StepHeader step={step} startedLoggedIn={startedLoggedIn} identifiedEmail={identifiedEmail} />

        <div key={step} className="animate-in fade-in slide-in-from-right-4 duration-300">
          {step === 1 && <IdentifyStep onIdentified={handleIdentified} />}

          {step === 2 && (
            <ShippingStep
              zones={shippingZones}
              initialAddress={shippingAddress}
              initialZone={shippingZone}
              onContinue={(address, zone) => {
                setShippingAddress(address);
                setShippingZone(zone);
                setStep(3);
              }}
            />
          )}

          {step === 3 && (
            <PaymentStep
              manualPaymentMethods={manualPaymentMethods}
              value={paymentMethod}
              onChange={setPaymentMethod}
              coupons={coupons}
              selectedCouponCode={selectedCouponCode}
              onCouponChange={handleSelectCoupon}
              promoCodeInput={promoCodeInput}
              onPromoCodeInputChange={setPromoCodeInput}
              appliedPromo={appliedPromo}
              promoError={promoError}
              isApplyingPromo={isApplyingPromo}
              onApplyPromo={handleApplyPromo}
              onClearPromo={handleClearPromo}
              onContinue={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          )}

          {step === 4 && (
            <ConfirmStep
              shippingAddress={shippingAddress}
              shippingZone={shippingZone}
              paymentMethod={paymentMethod}
              manualPaymentMethods={manualPaymentMethods}
              isSubmitting={isSubmittingOrder}
              onConfirm={handleFinalize}
              onBack={() => setStep(3)}
            />
          )}
        </div>
      </div>

      <OrderSummary
        items={items}
        subtotal={subtotal}
        shippingCost={shippingCost}
        discountAmount={discountAmount}
        discountLabel={discountLabel}
        total={total}
      />
    </div>
  );
}

function StepHeader({
  step,
  startedLoggedIn,
  identifiedEmail,
}: {
  step: Step;
  startedLoggedIn: boolean;
  identifiedEmail: string | null;
}) {
  const steps: Step[] = startedLoggedIn ? [2, 3, 4] : [1, 2, 3, 4];

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {steps.map((s, index) => (
        <div key={s} className="flex items-center gap-2">
          {index > 0 && <span className="text-neutral-300 dark:text-neutral-700">→</span>}
          <span
            className={
              s === step
                ? "flex items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-1 font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
                : s < step
                  ? "flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-green-700 dark:bg-green-950 dark:text-green-300"
                  : "flex items-center gap-1.5 rounded-full px-3 py-1 text-neutral-400"
            }
          >
            {STEP_LABELS[s]}
          </span>
        </div>
      ))}
      {identifiedEmail && step > 1 && (
        <span className="ml-auto text-xs text-neutral-500">Comprando como {identifiedEmail}</span>
      )}
    </div>
  );
}

function ShippingStep({
  zones,
  initialAddress,
  initialZone,
  onContinue,
}: {
  zones: ShippingZoneOption[];
  initialAddress: ShippingAddress | null;
  initialZone: ShippingZoneOption | null;
  onContinue: (address: ShippingAddress, zone: ShippingZoneOption | null) => void;
}) {
  const [calle, setCalle] = useState(initialAddress?.calle ?? "");
  const [numero, setNumero] = useState(initialAddress?.numero ?? "");
  const [piso, setPiso] = useState(initialAddress?.piso ?? "");
  const [ciudad, setCiudad] = useState(initialAddress?.ciudad ?? "");
  const [departamento, setDepartamento] = useState(initialAddress?.departamento ?? "");
  const [cp, setCp] = useState(initialAddress?.cp ?? "");
  const [zoneId, setZoneId] = useState<string | null>(initialZone?.id ?? null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const parsed = shippingAddressSchema.safeParse({ calle, numero, piso, ciudad, departamento, cp });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa la direccion.");
      return;
    }

    const zone = zones.find((z) => z.id === zoneId) ?? null;
    onContinue(parsed.data, zone);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="font-medium">Direccion de envio</h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor="calle" className="mb-1 block text-sm font-medium">
            Calle
          </label>
          <input id="calle" value={calle} onChange={(e) => setCalle(e.target.value)} required className={inputClass} />
        </div>
        <div>
          <label htmlFor="numero" className="mb-1 block text-sm font-medium">
            Numero
          </label>
          <input id="numero" value={numero} onChange={(e) => setNumero(e.target.value)} required className={inputClass} />
        </div>
        <div>
          <label htmlFor="piso" className="mb-1 block text-sm font-medium">
            Piso / Depto (opcional)
          </label>
          <input id="piso" value={piso} onChange={(e) => setPiso(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="ciudad" className="mb-1 block text-sm font-medium">
            Ciudad
          </label>
          <input id="ciudad" value={ciudad} onChange={(e) => setCiudad(e.target.value)} required className={inputClass} />
        </div>
        <div>
          <label htmlFor="departamento" className="mb-1 block text-sm font-medium">
            Departamento
          </label>
          <input
            id="departamento"
            value={departamento}
            onChange={(e) => setDepartamento(e.target.value)}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="cp" className="mb-1 block text-sm font-medium">
            Codigo postal
          </label>
          <input id="cp" value={cp} onChange={(e) => setCp(e.target.value)} required className={inputClass} />
        </div>
      </div>

      <fieldset className="flex flex-col gap-2 rounded border border-neutral-200 p-3 dark:border-neutral-800">
        <legend className="px-1 text-sm font-medium">Zona de envio</legend>
        {zones.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Todavia no hay zonas de envio cargadas — coordinamos el envio con vos despues de confirmar el pedido.
          </p>
        ) : (
          <>
            <label className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2">
                <input type="radio" name="shipping-zone" checked={zoneId === null} onChange={() => setZoneId(null)} />
                A coordinar / retiro en local
              </span>
              <span className="text-neutral-500">Gratis</span>
            </label>
            {zones.map((zone) => (
              <label key={zone.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="shipping-zone"
                    checked={zoneId === zone.id}
                    onChange={() => setZoneId(zone.id)}
                  />
                  <span>
                    {zone.name}
                    {zone.description && <span className="ml-1 text-xs text-neutral-500">({zone.description})</span>}
                  </span>
                </span>
                <span className="shrink-0 text-neutral-500">{formatCurrency(Number(zone.cost))}</span>
              </label>
            ))}
          </>
        )}
      </fieldset>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        className="self-start rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white active:scale-[0.98] dark:bg-neutral-100 dark:text-neutral-900"
      >
        Continuar
      </button>
    </form>
  );
}

function PaymentStep({
  manualPaymentMethods,
  value,
  onChange,
  coupons,
  selectedCouponCode,
  onCouponChange,
  promoCodeInput,
  onPromoCodeInputChange,
  appliedPromo,
  promoError,
  isApplyingPromo,
  onApplyPromo,
  onClearPromo,
  onContinue,
  onBack,
}: {
  manualPaymentMethods: ManualPaymentMethodOption[];
  value: PaymentMethodValue;
  onChange: (value: PaymentMethodValue) => void;
  coupons: CouponRow[];
  selectedCouponCode: string | null;
  onCouponChange: (code: string | null) => void;
  promoCodeInput: string;
  onPromoCodeInputChange: (value: string) => void;
  appliedPromo: { code: string; type: "percent" | "fixed"; value: number; discountAmount: number } | null;
  promoError: string | null;
  isApplyingPromo: boolean;
  onApplyPromo: () => void;
  onClearPromo: () => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="font-medium">Medio de pago</h2>

      {coupons.length > 0 && (
        <div>
          <label htmlFor="coupon-select" className="mb-1 block text-sm font-medium">
            Cupon de puntos (opcional)
          </label>
          <select
            id="coupon-select"
            value={selectedCouponCode ?? ""}
            onChange={(e) => onCouponChange(e.target.value || null)}
            className={inputClass}
          >
            <option value="">Sin cupon</option>
            {coupons.map((coupon) => (
              <option key={coupon.id} value={coupon.code}>
                {coupon.code} — {formatCurrency(Number(coupon.amount))} de descuento
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Codigo de promocion general (backlog "sistema de ofertas/
          descuentos"): texto libre, no requiere cuenta ni puntos --
          mutuamente excluyente con el cupon de puntos de arriba. */}
      <div>
        <label htmlFor="promo-code" className="mb-1 block text-sm font-medium">
          Codigo de promocion (opcional)
        </label>
        {appliedPromo ? (
          <div className="flex items-center justify-between gap-2 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm dark:border-green-900 dark:bg-green-950">
            <span className="font-mono text-green-700 dark:text-green-300">
              {appliedPromo.code} — {formatCurrency(appliedPromo.discountAmount)} de descuento
            </span>
            <button type="button" onClick={onClearPromo} className="text-xs text-neutral-500 underline">
              Quitar
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              id="promo-code"
              value={promoCodeInput}
              onChange={(e) => onPromoCodeInputChange(e.target.value)}
              placeholder="VERANO10"
              className={`${inputClass} uppercase`}
            />
            <button
              type="button"
              onClick={onApplyPromo}
              disabled={!promoCodeInput.trim() || isApplyingPromo}
              className="shrink-0 rounded border border-neutral-300 px-3 py-2 text-sm active:scale-[0.98] disabled:opacity-50 dark:border-neutral-700"
            >
              {isApplyingPromo ? "Aplicando..." : "Aplicar"}
            </button>
          </div>
        )}
        {promoError && <p className="mt-1 text-xs text-red-600">{promoError}</p>}
      </div>

      {manualPaymentMethods.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Vas a completar el pago con Mercado Pago (tarjeta, dinero en cuenta y los demas medios que ofrece su
          Checkout).
        </p>
      ) : (
        <>
          <PaymentMethodPicker manualPaymentMethods={manualPaymentMethods} value={value} onChange={onChange} />
          <p className="text-xs text-neutral-500">
            {value === "mercado_pago"
              ? "Vas a completar el pago de forma segura en Mercado Pago (redirige al finalizar)."
              : "Al confirmar se genera una orden de servicio: te mandamos por mail donde pagar y un admin confirma el pago cuando lo verifica."}
          </p>
        </>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onContinue}
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white active:scale-[0.98] dark:bg-neutral-100 dark:text-neutral-900"
        >
          Continuar
        </button>
        <button
          type="button"
          onClick={onBack}
          className="rounded border border-neutral-300 px-4 py-2 text-sm active:scale-[0.98] dark:border-neutral-700"
        >
          Volver
        </button>
      </div>
    </div>
  );
}

function ConfirmStep({
  shippingAddress,
  shippingZone,
  paymentMethod,
  manualPaymentMethods,
  isSubmitting,
  onConfirm,
  onBack,
}: {
  shippingAddress: ShippingAddress | null;
  shippingZone: ShippingZoneOption | null;
  paymentMethod: PaymentMethodValue;
  manualPaymentMethods: ManualPaymentMethodOption[];
  isSubmitting: boolean;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const methodLabel =
    paymentMethod === "mercado_pago"
      ? "Mercado Pago"
      : (manualPaymentMethods.find((m) => m.value === paymentMethod)?.label ?? paymentMethod);

  return (
    <div className="flex flex-col gap-4 rounded border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="font-medium">Revisa y confirma</h2>

      {shippingAddress && (
        <div>
          <p className="text-sm font-medium">Envio</p>
          <p className="text-sm text-neutral-500">
            {shippingAddress.calle} {shippingAddress.numero}
            {shippingAddress.piso ? `, ${shippingAddress.piso}` : ""}, {shippingAddress.ciudad},{" "}
            {shippingAddress.departamento} (CP {shippingAddress.cp})
          </p>
          <p className="text-sm text-neutral-500">{shippingZone ? shippingZone.name : "A coordinar / retiro en local"}</p>
        </div>
      )}

      <div>
        <p className="text-sm font-medium">Pago</p>
        <p className="text-sm text-neutral-500">{methodLabel}</p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting}
          className="flex items-center justify-center gap-2 rounded bg-accent px-4 py-2 text-sm font-medium text-accent-foreground active:scale-[0.98] disabled:opacity-50 hover:bg-accent-hover"
        >
          {isSubmitting && <Spinner size={14} />}
          {isSubmitting ? "Procesando..." : paymentMethod === "mercado_pago" ? "Finalizar compra" : "Generar orden de servicio"}
        </button>
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="rounded border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
        >
          Volver
        </button>
      </div>
    </div>
  );
}

function OrderSummary({
  items,
  subtotal,
  shippingCost,
  discountAmount,
  discountLabel,
  total,
}: {
  items: CartRow[];
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  discountLabel: string;
  total: number;
}) {
  return (
    <aside className="flex h-fit flex-col gap-3 rounded border border-neutral-200 p-4 dark:border-neutral-800">
      <p className="font-medium">Resumen de la compra</p>
      <Link href="/carrito" className="text-xs text-neutral-500 underline">
        Volver al carrito
      </Link>

      <ul className="flex flex-col gap-1">
        {items.map((row) => (
          <li key={row.item.id} className="flex justify-between text-sm">
            <span className="text-neutral-600 dark:text-neutral-400">
              {row.item.quantity}x {row.product.name}
            </span>
            <span>{formatCurrency(Number(row.variant.price) * row.item.quantity)}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-1 border-t border-neutral-200 pt-3 text-sm dark:border-neutral-800">
        <div className="flex justify-between text-neutral-500">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-green-700 dark:text-green-400">
            <span>{discountLabel}</span>
            <span>-{formatCurrency(discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between text-neutral-500">
          <span>Envio</span>
          <span>{shippingCost > 0 ? formatCurrency(shippingCost) : "A coordinar"}</span>
        </div>
      </div>

      <div className="flex justify-between border-t border-neutral-200 pt-3 font-semibold dark:border-neutral-800">
        <span>Total</span>
        <span>{formatCurrency(total)}</span>
      </div>
    </aside>
  );
}

// Pantalla de "orden de servicio creada" (task #6): antes era una cajita de
// texto minima. El owner mando de referencia el comprobante de Tata.com.uy
// (codigo grande, QR, direccion, articulos) para que este momento -- justo
// despues de comprometerse a pagar por fuera de Mercado Pago -- transmita
// mas confianza. El resumen (OrderReceiptCard) se pide en un segundo viaje
// al server porque manualResult no trae items/direccion (checkoutCart no
// los devuelve para no duplicar el payload) -- se busca por orderId apenas
// se conoce, reusando el mismo getReceiptView que arma el comprobante
// permanente de /mi-cuenta/compras/[id].
function ManualOrderResult({
  manualResult,
  instagramUrl,
  facebookUrl,
  whatsappHref,
}: {
  manualResult: ManualResult;
  instagramUrl: string | null;
  facebookUrl: string | null;
  whatsappHref: string | null;
}) {
  const [receipt, setReceipt] = useState<OrderReceiptCardProps | null>(null);

  useEffect(() => {
    let cancelled = false;
    getReceiptView(manualResult.orderId)
      .then((data) => {
        if (!cancelled && data) setReceipt(data);
      })
      .catch(() => {
        // no-op: si falla, igual mostramos las instrucciones de pago abajo
      });
    return () => {
      cancelled = true;
    };
  }, [manualResult.orderId]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Orden de servicio creada</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Te mandamos un mail con estos mismos datos. En cuanto confirmemos que el pago llego, te avisamos por mail
          que nos vamos a poner en contacto para coordinar la entrega.
        </p>
      </div>

      {receipt ? (
        <OrderReceiptCard {...receipt} />
      ) : (
        <div className="h-64 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900" />
      )}

      <div className="rounded bg-neutral-100 p-3 text-sm dark:bg-neutral-900">
        <p className="font-medium">{manualResult.methodLabel}</p>
        <p className="mt-1 whitespace-pre-line text-neutral-600 dark:text-neutral-400">{manualResult.instructions}</p>
      </div>

      {manualResult.receiptEligible && <ReceiptUpload orderId={manualResult.orderId} />}

      <Link href="/mi-cuenta/pedidos" className="text-sm underline">
        Ver mis pedidos
      </Link>

      <PostPurchaseFollow instagramUrl={instagramUrl} facebookUrl={facebookUrl} whatsappHref={whatsappHref} />
    </div>
  );
}

// Opcional: el cliente puede subir el comprobante ahora mismo (si ya tiene
// la transferencia hecha) o mas adelante — no bloquea nada, es solo una
// ayuda para que el admin confirme el pago mas rapido.
function ReceiptUpload({ orderId }: { orderId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) return;
    setError(null);
    setIsUploading(true);
    try {
      await uploadPaymentReceipt(orderId, file);
      setUploaded(true);
      toast.success("Comprobante subido.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir el comprobante.");
    } finally {
      setIsUploading(false);
    }
  }

  if (uploaded) {
    return <p className="text-sm text-green-700 dark:text-green-400">Comprobante subido, gracias.</p>;
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-neutral-200 p-3 dark:border-neutral-800">
      <p className="text-sm font-medium">Ya tenes el comprobante? Subilo aca (opcional)</p>
      <input
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={handleUpload}
        disabled={!file || isUploading}
        className="flex items-center justify-center gap-2 self-start rounded border border-neutral-300 px-3 py-1.5 text-sm active:scale-[0.98] disabled:opacity-50 dark:border-neutral-700"
      >
        {isUploading && <Spinner size={14} />}
        {isUploading ? "Subiendo..." : "Subir comprobante"}
      </button>
    </div>
  );
}
