import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq, like } from "drizzle-orm";
import { db } from "@/lib/db";
import { customOrders, orders } from "@/lib/db/schema";
import { contentTypeForExtension, isObjectStorageConfigured, uploadToStorage } from "@/lib/storage";

// Migra a MinIO los comprobantes de pago y STL/OBJ de pedidos a medida que
// todavia estan en el volumen local (/uploads, formato viejo). Corre UNA
// VEZ, en el mismo entorno donde vive el volumen (adentro del contenedor de
// tienda3d en el VPS, no en tu maquina) -- necesita leer los archivos del
// disco Y tener las env vars de MinIO configuradas.
//
// Uso: npm run uploads:migrate-to-minio
//
// Es idempotente: solo toca filas cuyo receiptUrl/fileUrl todavia empieza
// con "/uploads/" (ver resolveFileUrl en lib/storage). Si un archivo ya fue
// migrado o la fila no tiene comprobante, se salta. Si el archivo no existe
// en disco (por ejemplo, se perdio en algun momento), lo reporta pero no
// frena el resto de la migracion.

async function migrateReceipts() {
  if (!isObjectStorageConfigured()) {
    throw new Error("MinIO no esta configurado (faltan MINIO_ENDPOINT/ACCESS_KEY/SECRET_KEY). Abortando.");
  }

  const uploadsDir = process.env.UPLOADS_DIR ?? "./public/uploads";

  const legacyOrders = await db.select().from(orders).where(like(orders.receiptUrl, "/uploads/%"));
  console.log(`Comprobantes a migrar: ${legacyOrders.length}`);

  let ok = 0;
  let failed = 0;
  for (const order of legacyOrders) {
    if (!order.receiptUrl) continue;
    try {
      const localPath = path.join(uploadsDir, order.receiptUrl.replace(/^\/uploads\//, ""));
      const buffer = await readFile(localPath);
      const filename = path.basename(order.receiptUrl);
      const ext = filename.split(".").pop()?.toLowerCase() ?? "";
      const objectKey = `receipts/${order.id}/${filename}`;

      await uploadToStorage(objectKey, buffer, contentTypeForExtension(ext));
      await db.update(orders).set({ receiptUrl: objectKey }).where(eq(orders.id, order.id));
      ok++;
      console.log(`  OK   orden ${order.orderNumber} (${order.id}) -> ${objectKey}`);
    } catch (error) {
      failed++;
      console.error(`  FAIL orden ${order.orderNumber} (${order.id}): ${error instanceof Error ? error.message : error}`);
    }
  }
  console.log(`Comprobantes: ${ok} migrados, ${failed} con error.\n`);
}

async function migrateCustomOrderFiles() {
  const uploadsDir = process.env.UPLOADS_DIR ?? "./public/uploads";

  const legacyCustomOrders = await db.select().from(customOrders).where(like(customOrders.fileUrl, "/uploads/%"));
  console.log(`Archivos de pedidos a medida a migrar: ${legacyCustomOrders.length}`);

  let ok = 0;
  let failed = 0;
  for (const customOrder of legacyCustomOrders) {
    try {
      const localPath = path.join(uploadsDir, customOrder.fileUrl.replace(/^\/uploads\//, ""));
      const buffer = await readFile(localPath);
      const filename = path.basename(customOrder.fileUrl);
      const ext = filename.split(".").pop()?.toLowerCase() ?? "";
      const objectKey = `custom-orders/${customOrder.id}/${filename}`;

      await uploadToStorage(objectKey, buffer, contentTypeForExtension(ext));
      await db.update(customOrders).set({ fileUrl: objectKey }).where(eq(customOrders.id, customOrder.id));
      ok++;
      console.log(`  OK   pedido a medida ${customOrder.id} -> ${objectKey}`);
    } catch (error) {
      failed++;
      console.error(`  FAIL pedido a medida ${customOrder.id}: ${error instanceof Error ? error.message : error}`);
    }
  }
  console.log(`Pedidos a medida: ${ok} migrados, ${failed} con error.\n`);
}

async function main() {
  await migrateReceipts();
  await migrateCustomOrderFiles();
  console.log("Listo. Los archivos que dieron error siguen sirviendo desde /uploads (no se tocaron).");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
