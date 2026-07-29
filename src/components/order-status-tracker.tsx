import { Check } from "lucide-react";

// Pipeline compartido por compras de catalogo y pedidos a medida una vez
// pagados (ver orderStatusEnum en src/lib/db/schema.ts) — un solo lugar para
// no repetir esta lista en admin/pedidos y en las pantallas de cliente.
const PIPELINE: { value: string; label: string }[] = [
  { value: "pagado", label: "Pagado" },
  { value: "en_cola", label: "En cola" },
  { value: "imprimiendo", label: "Imprimiendo" },
  { value: "postprocesado", label: "Postprocesado" },
  { value: "enviado", label: "Enviado" },
  { value: "entregado", label: "Entregado" },
];

export function OrderStatusTracker({ status }: { status: string }) {
  if (status === "cancelado") {
    return <p className="text-sm text-neutral-500">Este pedido fue cancelado.</p>;
  }
  if (status === "pendiente_pago" || status === "pendiente_confirmacion") {
    return <p className="text-sm text-neutral-500">Esperando confirmacion del pago.</p>;
  }

  const currentIndex = PIPELINE.findIndex((step) => step.value === status);
  if (currentIndex === -1) return null;

  return (
    <div className="flex items-center">
      {PIPELINE.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <div key={step.value} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium transition-colors ${
                  done
                    ? "bg-accent text-accent-foreground"
                    : active
                      ? "bg-accent/15 text-accent ring-2 ring-accent"
                      : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800"
                }`}
              >
                {done ? <Check size={12} /> : index + 1}
              </div>
              <span
                className={`text-center text-[11px] whitespace-nowrap ${
                  active ? "font-medium text-neutral-900 dark:text-neutral-100" : "text-neutral-500"
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < PIPELINE.length - 1 && (
              <div className={`mx-1 h-px flex-1 ${done ? "bg-accent" : "bg-neutral-200 dark:bg-neutral-800"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
