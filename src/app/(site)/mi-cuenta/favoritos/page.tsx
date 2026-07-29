import Link from "next/link";
import { getMyFavoriteProducts } from "@/lib/favorites/actions";
import { ProductCard } from "../../product-card";

// Consulta la DB directo (favoritos del usuario logueado): mismo criterio
// que el resto de /mi-cuenta/*, sin esto el build de Docker en EasyPanel
// intenta pre-renderizarla en build time y falla.
export const dynamic = "force-dynamic";

export default async function MiCuentaFavoritosPage() {
  const products = await getMyFavoriteProducts();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Mis favoritos</h1>
      <p className="mt-1 text-neutral-500">Los productos que guardaste para mas adelante.</p>

      {products.length === 0 ? (
        <p className="mt-6 text-neutral-500">
          Todavia no guardaste ningun favorito.{" "}
          <Link href="/#catalogo" className="underline">
            Ver catalogo
          </Link>
          .
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} favorited />
          ))}
        </div>
      )}
    </main>
  );
}
