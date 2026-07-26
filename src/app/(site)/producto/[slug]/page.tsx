import { db } from "@/lib/db";
import { products, productVariants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [product] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  if (!product) notFound();

  const variants = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, product.id));

  return (
    <main style={{ maxWidth: 700, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <p>$ {product.basePrice}</p>

      <h2>Variantes</h2>
      <ul>
        {variants.map((v) => (
          <li key={v.id}>
            {v.material} {v.color ?? ""} {v.size ?? ""} — $ {v.price} — stock: {v.stock}
          </li>
        ))}
      </ul>
      {/* TODO: selector de variante + boton "Agregar al carrito" (ver mockup ficha_producto_3d) */}
    </main>
  );
}
