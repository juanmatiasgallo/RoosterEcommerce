import Link from "next/link";
import { getMyInquiryForProduct } from "@/lib/inquiries/actions";
import { ProductInquiryClient } from "./product-inquiry-client";

// Preguntas privadas sobre el producto (task #46): a diferencia de las
// reseñas (ProductReviews, publicas), esta charla es solo entre el cliente
// logueado y el staff -- ni otros clientes ni visitantes anonimos la ven.
// Por eso vive en su propia seccion, gateada a role "cliente", en vez de
// integrarse a ProductReviews.
export async function ProductInquiry({
  productId,
  productSlug,
  isLoggedIn,
  role,
}: {
  productId: string;
  productSlug: string;
  isLoggedIn: boolean;
  role?: string;
}) {
  const isCliente = isLoggedIn && role === "cliente";
  const thread = isCliente ? await getMyInquiryForProduct(productId) : null;

  return (
    <section id="preguntas" className="mt-14 scroll-mt-20">
      <h2 className="text-lg font-semibold">Preguntas sobre este producto</h2>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        Consulta algo puntual antes de comprar -- la respuesta del equipo se ve solo aca, en tu cuenta.
      </p>

      <div className="mt-4 max-w-xl">
        {isCliente ? (
          <ProductInquiryClient
            productId={productId}
            productSlug={productSlug}
            initialInquiry={thread?.inquiry ?? null}
            initialMessages={thread?.messages ?? []}
          />
        ) : isLoggedIn ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Esta funcion es para clientes -- inicia sesion con una cuenta de cliente para preguntar.
          </p>
        ) : (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            <Link href="/login" className="underline">
              Inicia sesion
            </Link>{" "}
            para hacer una pregunta privada sobre este producto.
          </p>
        )}
      </div>
    </section>
  );
}
