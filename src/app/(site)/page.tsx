import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";

/**
 * Pagina principal publica: TODOS los articulos activos del catalogo.
 * Server Component, sin cache manual (Next cachea el fetch de datos via
 * revalidatePath cuando se cree/edite un producto desde /admin).
 */
export default async function HomePage() {
  const catalog = await db
    .select()
    .from(products)
    .where(eq(products.active, true));

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1>Catalogo</h1>
      <p>Todos nuestros articulos disponibles para impresion 3D.</p>

      {catalog.length === 0 && (
        <p>
          Todavia no hay productos cargados. Cargalos desde{" "}
          <Link href="/admin/productos">/admin/productos</Link>.
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "1rem",
          marginTop: "1.5rem",
        }}
      >
        {catalog.map((product) => (
          <Link
            key={product.id}
            href={`/producto/${product.slug}`}
            style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1rem" }}
          >
            <strong>{product.name}</strong>
            <p>$ {product.basePrice}</p>
          </Link>
        ))}
      </div>

      <p style={{ marginTop: "2rem" }}>
        ¿Necesitas algo que no esta en el catalogo?{" "}
        <Link href="/pedido-a-medida">Pedila a medida</Link>.
      </p>
    </main>
  );
}
