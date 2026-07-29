"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { checkEmailExists, registerUser } from "@/lib/auth/actions";
import { loginSchema, registerSchema } from "@/lib/auth/schema";
import { getCartItems, mergeGuestCartIntoUser, type CartRow } from "@/lib/cart/actions";
import { checkoutCart } from "@/lib/orders/actions";
import { shippingAddressSchema, type ShippingAddress } from "@/lib/orders/schema";
import {
  PaymentMethodPicker,
  type ManualPaymentMethodOption,
  type PaymentMethodValue,
} from "@/components/payment-method-picker";

type ShippingZoneOption = { id: string; name: string; description: string | null; cost: string };
type Step = 1 | 2 | 3 | 4;
type ManualResult = { orderNumber: number; methodLabel: string; instructions: string };

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
  manualPaymentMethods,
  shippingZones,
}: {
  initialItems: CartRow[];
  initialTotal: number;
  initialUserEmail: string | null;
  manualPaymentMethods: ManualPaymentMethodOption[];
  shippingZones: ShippingZoneOption[];
}) {
  const startedLoggedIn = Boolean(initialUserEmail);
  const [step, setStep] = useState<Step>(startedLoggedIn ? 2 : 1);
  const [items, setItems] = useState(initialItems);
  const [subtotal, setSubtotal] = useState(initialTotal);
  const [identifiedEmail, setIdentifiedEmail] = useState(initialUserEmail);

  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null);
  const [shippingZone, setShippingZone] = useState<ShippingZoneOption | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodValue>("mercado_pago");

  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [manualResult, setManualResult] = useState<ManualResult | null>(null);

  const shippingCost = shippingZone ? Number(shippingZone.cost) : 0;
  const total = subtotal + shippingCost;

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
      <div className="flex flex-col gap-4 rounded border border-neutral-200 p-6 dark:border-neutral-800">
        <h2 className="text-lg font-semibold">Orden de servicio #{manualResult.orderNumber} creada</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Te mandamos un mail con estos mismos datos. En cuanto confirmemos que el pago llego, vas a ver la orden
          actualizada en{" "}
          <Link href="/mi-cuenta/pedidos" className="underline">
            tu cuenta
          </Link>
          .
        </p>
        <div className="rounded bg-neutral-100 p-3 text-sm dark:bg-neutral-900">
          <p className="font-medium">{manualResult.methodLabel}</p>
          <p className="mt-1 whitespace-pre-line text-neutral-600 dark:text-neutral-400">
            {manualResult.instructions}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-4">
        <StepHeader step={step} startedLoggedIn={startedLoggedIn} identifiedEmail={identifiedEmail} />

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

      <OrderSummary items={items} subtotal={subtotal} shippingCost={shippingCost} total={total} />
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

function IdentifyStep({ onIdentified }: { onIdentified: (email: string) => void }) {
  const [mode, setMode] = useState<"email" | "login" | "register">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  async function handleCheckEmail(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = loginSchema.shape.email.safeParse(email);
    if (!parsed.success) {
      setError("Ingresa un email valido.");
      return;
    }

    setIsChecking(true);
    try {
      const { exists } = await checkEmailExists(email);
      setMode(exists ? "login" : "register");
    } catch {
      setError("No se pudo verificar el email, proba de nuevo.");
    } finally {
      setIsChecking(false);
    }
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los datos.");
      return;
    }

    setIsChecking(true);
    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (!result || result.error) {
        setError("Email o contrasena incorrectos.");
        return;
      }
      onIdentified(email);
    } catch {
      setError("Email o contrasena incorrectos.");
    } finally {
      setIsChecking(false);
    }
  }

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = registerSchema.safeParse({ name, email, phone, password, confirmPassword, acceptTerms });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los datos.");
      return;
    }

    setIsChecking(true);
    try {
      await registerUser(parsed.data);
      const result = await signIn("credentials", { email, password, redirect: false });
      if (!result || result.error) {
        setError("La cuenta se creo pero no se pudo iniciar sesion. Proba desde /login.");
        return;
      }
      onIdentified(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta.");
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <div className="rounded border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="font-medium">Identificacion de cuenta</h2>

      {mode === "email" && (
        <form onSubmit={handleCheckEmail} className="mt-3 flex flex-col gap-3">
          <div>
            <label htmlFor="checkout-email" className="mb-1 block text-sm font-medium">
              Ingresa tu correo electronico
            </label>
            <input
              id="checkout-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={isChecking}
            className="self-start rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {isChecking ? "Verificando..." : "Continuar"}
          </button>
        </form>
      )}

      {mode === "login" && (
        <form onSubmit={handleLogin} className="mt-3 flex flex-col gap-3">
          <p className="text-sm text-neutral-500">
            Ya tenes cuenta con <span className="font-medium">{email}</span>.
          </p>
          <div>
            <label htmlFor="checkout-password" className="mb-1 block text-sm font-medium">
              Contrasena
            </label>
            <input
              id="checkout-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isChecking}
              className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
            >
              {isChecking ? "Ingresando..." : "Ingresar"}
            </button>
            <button
              type="button"
              onClick={() => setMode("email")}
              className="rounded border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
            >
              Usar otro mail
            </button>
          </div>
        </form>
      )}

      {mode === "register" && (
        <form onSubmit={handleRegister} className="mt-3 flex flex-col gap-3">
          <p className="text-sm text-neutral-500">
            No encontramos una cuenta con <span className="font-medium">{email}</span>. Completa estos datos para
            crearla.
          </p>
          <div>
            <label htmlFor="checkout-name" className="mb-1 block text-sm font-medium">
              Nombre
            </label>
            <input id="checkout-name" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label htmlFor="checkout-phone" className="mb-1 block text-sm font-medium">
              Celular de contacto
            </label>
            <input
              id="checkout-phone"
              type="tel"
              placeholder="+598 99 000 000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="checkout-new-password" className="mb-1 block text-sm font-medium">
              Contrasena
            </label>
            <input
              id="checkout-new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="checkout-confirm-password" className="mb-1 block text-sm font-medium">
              Repetir contrasena
            </label>
            <input
              id="checkout-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
            />
            <span>
              Acepto los{" "}
              <Link href="/terminos-y-condiciones" target="_blank" className="underline">
                terminos y condiciones
              </Link>
              .
            </span>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isChecking}
              className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
            >
              {isChecking ? "Creando cuenta..." : "Crear cuenta y continuar"}
            </button>
            <button
              type="button"
              onClick={() => setMode("email")}
              className="rounded border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
            >
              Usar otro mail
            </button>
          </div>
        </form>
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
        className="self-start rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
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
  onContinue,
  onBack,
}: {
  manualPaymentMethods: ManualPaymentMethodOption[];
  value: PaymentMethodValue;
  onChange: (value: PaymentMethodValue) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="font-medium">Medio de pago</h2>

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
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          Continuar
        </button>
        <button type="button" onClick={onBack} className="rounded border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700">
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
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50 hover:bg-accent-hover"
        >
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
  total,
}: {
  items: CartRow[];
  subtotal: number;
  shippingCost: number;
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
