import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pago exitoso",
};

export default function CheckoutExitoPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Listo, tu pago se proceso</h1>
      <p className="mt-2 text-neutral-500">
        En unos instantes vas a ver el pedido confirmado en tu cuenta. Si tarda mas de un par de
        minutos, no te preocupes: la confirmacion final la hace Mercado Pago y puede demorar un
        poco en reflejarse.
      </p>

      <div className="mt-6 flex justify-center gap-3">
        <Link
          href="/mi-cuenta/pedidos"
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          Ver mis pedidos
        </Link>
        <Link href="/" className="rounded border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700">
          Volver al catalogo
        </Link>
      </div>
    </main>
  );
}
