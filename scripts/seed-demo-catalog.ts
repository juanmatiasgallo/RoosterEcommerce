import "dotenv/config";
import { seedDemoCatalog } from "@/lib/catalog/seed-demo";

// Uso: npm run catalog:seed-demo
//
// Pensado para correr local/dev. En produccion (build standalone, sin tsx)
// usar el boton "Cargar catalogo demo" en /admin/productos en vez de este
// script (ver src/lib/catalog/seed-demo-actions.ts) -- misma logica
// compartida, mismo criterio que uploads:migrate-to-minio.
//
// Requiere que la migracion de products/product_variants.code (task #88) ya
// este aplicada contra la base a la que apunta DATABASE_URL -- el seed
// genera codigo igual que createProduct/createVariant (nextval de
// product_code_seq), asi que la secuencia tiene que existir.

async function main() {
  const summary = await seedDemoCatalog();

  console.log(`Categorias: ${summary.categoriesCreated} nuevas, ${summary.categoriesSkipped} ya existian.`);
  console.log(`Productos: ${summary.productsCreated} nuevos, ${summary.productsSkipped} ya existian.`);
  console.log("Listo.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
