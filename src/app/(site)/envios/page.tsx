import type { Metadata } from "next";
import { formatCurrency } from "@/lib/format";
import { listActiveShippingZones } from "@/lib/shipping/actions";

export const metadata: Metadata = {
  title: "Envios",
  description: "Costos y zonas de envio de Tienda 3D.",
};

// Consulta la DB: sin esto, el build de Docker en EasyPanel intenta
// pre-renderizar en build time y falla (no tiene red hacia la base ahi).
export const dynamic = "force-dynamic";

export default async function EnviosPage() {
  const zones = await listActiveShippingZones();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Envios</h1>
      <p className="mt-1 text-neutral-500">
        Una vez confirmado el pago te contactamos para coordinar el envio o el retiro segun tu zona.
      </p>

      {zones.length === 0 ? (
        <p className="mt-6 text-sm text-neutral-500">
          Todavia no cargamos costos de envio por zona — escribinos y te confirmamos el costo para tu direccion.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {zones.map((zone) => (
            <div
              key={zone.id}
              className="flex items-start justify-between gap-4 rounded border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <div>
                <p className="font-medium">{zone.name}</p>
                {zone.description && (
                  <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{zone.description}</p>
                )}
              </div>
              <p className="shrink-0 font-medium">{formatCurrency(Number(zone.cost))}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
