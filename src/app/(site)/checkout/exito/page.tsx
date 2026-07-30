import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getPublicStoreContact } from "@/lib/settings/actions";
import { getReceiptData } from "@/lib/receipt/actions";
import { PostPurchaseFollow } from "@/components/post-purchase-follow";

export const metadata: Metadata = {
  title: "Pago exitoso",
};

// Consulta la DB (datos de contacto para el bloque de seguinos/suscribite):
// sin esto, el build de Docker en EasyPanel la pre-renderiza en build time y
// falla (no tiene red hacia la base ahi) -- mismo motivo que el resto de
// /checkout/*.
export const dynamic = "force-dynamic";

export default async function CheckoutExitoPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; external_reference?: string }>;
}) {
  // Al volver de Mercado Pago (task #39), si la orden es una compra de
  // catalogo del usuario logueado la llevamos directo a su ticket (mismo
  // comprobante imprimible que ya existe en /mi-cuenta/compras/[id], con
  // QR y estado en vivo) en vez de mostrar solo un mensaje generico.
  // getReceiptData ya filtra por sesion + source "catalogo" -- si la orden
  // es de otro usuario, no es de catalogo (pedido a medida), o el pago
  // todavia no se confirmo por webhook, el comprobante igual existe (con
  // status "pendiente_pago"/"pendiente_confirmacion") y el tracker lo
  // muestra bien, asi que redirigir siempre que haya id es seguro.
  const params = await searchParams;
  const orderId = params.orderId || params.external_reference;
  if (orderId) {
    const receipt = await getReceiptData(orderId);
    if (receipt) {
      redirect(`/mi-cuenta/compras/${orderId}`);
    }
  }

  const contact = await getPublicStoreContact();
  const whatsappHref = contact.contactPhone ? `https://wa.me/${contact.contactPhone.replace(/\D/g, "")}` : null;

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

      <div className="mt-8 text-left">
        <PostPurchaseFollow
          instagramUrl={contact.instagramUrl}
          facebookUrl={contact.facebookUrl}
          whatsappHref={whatsappHref}
        />
      </div>
    </main>
  );
}
