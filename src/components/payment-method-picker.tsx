"use client";

import type { ManualPaymentMethod } from "@/lib/orders/actions";

export type ManualPaymentMethodOption = { value: ManualPaymentMethod; label: string; instructions: string };
export type PaymentMethodValue = "mercado_pago" | ManualPaymentMethod;

const radioClass = "flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300";

// Solo se renderiza si hay al menos un medio manual configurado (con
// instrucciones cargadas en /admin/configuracion) — si el unico medio
// disponible es Mercado Pago, no tiene sentido mostrar un selector con una
// sola opcion.
export function PaymentMethodPicker({
  manualPaymentMethods,
  value,
  onChange,
}: {
  manualPaymentMethods: ManualPaymentMethodOption[];
  value: PaymentMethodValue;
  onChange: (value: PaymentMethodValue) => void;
}) {
  if (manualPaymentMethods.length === 0) return null;

  return (
    <fieldset className="flex flex-col gap-2 rounded border border-neutral-200 p-3 dark:border-neutral-800">
      <legend className="px-1 text-sm font-medium">Medio de pago</legend>
      <label className={radioClass}>
        <input
          type="radio"
          name="payment-method"
          checked={value === "mercado_pago"}
          onChange={() => onChange("mercado_pago")}
        />
        Mercado Pago
      </label>
      {manualPaymentMethods.map((method) => (
        <label key={method.value} className={radioClass}>
          <input
            type="radio"
            name="payment-method"
            checked={value === method.value}
            onChange={() => onChange(method.value)}
          />
          {method.label}
        </label>
      ))}
    </fieldset>
  );
}
