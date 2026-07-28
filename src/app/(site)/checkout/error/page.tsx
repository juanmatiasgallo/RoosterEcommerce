import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pago no procesado",
};

export default function CheckoutErrorPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">No pudimos procesar el pago</h1>
      <p className="mt-2 text-neutral-500">
        El pago se rechazo o se cancelo. No se te cobro nada. Podes intentar de nuevo desde tu
        carrito o tu cuenta.
      </p>

      <div className="mt-6 flex justify-center gap-3">
        <Link
          href="/carrito"
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          Volver al carrito
        </Link>
        <Link href="/mi-cuenta/pedidos" className="rounded border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700">
          Ver mis pedidos
        </Link>
      </div>
    </main>
  );
}
