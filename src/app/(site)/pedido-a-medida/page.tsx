import { PedidoAMedidaFormClient } from "./pedido-a-medida-form-client";

/**
 * Requiere sesion, ya protegido en src/proxy.ts (no se duplica el chequeo
 * aca). No consulta la DB directo desde este Server Component (el envio
 * pasa por la Server Action createCustomOrder desde el client), asi que no
 * necesita force-dynamic.
 */
export default function PedidoAMedidaPage() {
  const maxSizeMb = Number(process.env.UPLOADS_MAX_SIZE_MB ?? 20);

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-semibold">Pedi tu pieza a medida</h1>
      <p className="mt-1 text-neutral-500">
        Subi tu archivo y te enviamos una cotizacion antes de cobrarte nada.
      </p>

      <div className="mt-6">
        <PedidoAMedidaFormClient maxSizeMb={maxSizeMb} />
      </div>
    </main>
  );
}
