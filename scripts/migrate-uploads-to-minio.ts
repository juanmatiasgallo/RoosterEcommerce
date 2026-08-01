import "dotenv/config";
import { runUploadsMigration } from "@/lib/storage/migrate";

// Uso: npm run uploads:migrate-to-minio
//
// Pensado para correr local/dev, donde el volumen de uploads y la DB son
// alcanzables directo. En produccion (imagen Docker node:22-alpine, build
// standalone) esta carpeta no existe dentro del contenedor -- ahi usar el
// boton "Migrar archivos legacy a MinIO" en /admin/configuracion en vez de
// este script (ver src/lib/storage/actions.ts).

async function main() {
  const summary = await runUploadsMigration();

  console.log(`Comprobantes: ${summary.receipts.ok} migrados, ${summary.receipts.failed} con error.`);
  for (const err of summary.receipts.errors) console.error(`  FAIL ${err}`);

  console.log(`Pedidos a medida: ${summary.customOrderFiles.ok} migrados, ${summary.customOrderFiles.failed} con error.`);
  for (const err of summary.customOrderFiles.errors) console.error(`  FAIL ${err}`);

  console.log("Listo. Los archivos que dieron error siguen sirviendo desde /uploads (no se tocaron).");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
