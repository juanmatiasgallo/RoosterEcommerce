import Link from "next/link";
import { getCartItems } from "@/lib/cart/actions";
import { CarritoClient } from "./carrito-client";

// Consulta la DB (via getCartItems): sin esto, el build de Docker en
// EasyPanel la pre-renderiza en build time y falla (no tiene red hacia la
// base ahi).
export const dynamic = "force-dynamic";

export default async function CarritoPage() {
  const { items, total } = await getCartItems();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Tu carrito</h1>

      {items.length === 0 ? (
        <p className="mt-4 text-neutral-500">
          Todavia no agregaste nada.{" "}
          <Link href="/" className="underline">
            Ver catalogo
          </Link>
          .
        </p>
      ) : (
        <CarritoClient items={items} total={total} />
      )}
    </main>
  );
}
