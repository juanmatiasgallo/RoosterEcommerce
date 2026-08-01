import "dotenv/config";
import { db } from "@/lib/db";
import { stores, categories, products, productVariants } from "@/lib/db/schema";
import { NEXT_PRODUCT_CODE_SQL, nextVariantCode } from "@/lib/catalog/code";

async function main() {
  let [store] = await db.select().from(stores).limit(1);
  if (!store) {
    [store] = await db.insert(stores).values({ name: "Tienda 3D", slug: "tienda-3d" }).returning();
  }

  const [categoriaPadre] = await db
    .insert(categories)
    .values({ storeId: store.id, name: "Figuras y decoracion", slug: "figuras-y-decoracion" })
    .returning();

  const [categoriaHija] = await db
    .insert(categories)
    .values({
      storeId: store.id,
      parentId: categoriaPadre.id,
      name: "Fantasia",
      slug: "fantasia",
    })
    .returning();

  const [product] = await db
    .insert(products)
    .values({
      storeId: store.id,
      slug: "figura-articulada-dragon",
      // Codigo publico (task #88): requiere que la migracion que crea
      // product_code_seq ya este aplicada contra la base de destino.
      code: NEXT_PRODUCT_CODE_SQL,
      name: "Figura articulada dragon",
      description: "Dragon articulado impreso en una sola pieza, sin ensamblaje.",
      categoryId: categoriaHija.id,
      basePrice: "890.00",
    })
    .returning();

  const seedVariants = [
    { material: "PLA", color: "Rojo", size: "25cm", price: "890.00", stock: 5 },
    { material: "PLA", color: "Azul", size: "25cm", price: "890.00", stock: 3 },
    { material: "PETG", color: "Negro", size: "35cm", price: "1190.00", stock: 2 },
  ];
  for (const variant of seedVariants) {
    const code = await nextVariantCode(product.id, product.code);
    await db.insert(productVariants).values({ productId: product.id, code, ...variant });
  }

  console.log("Seed completo.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
