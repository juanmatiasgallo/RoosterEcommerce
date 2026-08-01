import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq, like } from "drizzle-orm";
import { db } from "@/lib/db";
import { customOrders, orders } from "@/lib/db/schema";
import { contentTypeForExtension, isObjectStorageConfigured, uploadToStorage } from "@/lib/storage";

// Logica pura de la migracion de archivos legacy (/uploads) a MinIO,
// compartida por dos formas de dispararla:
//   1. scripts/migrate-uploads-to-minio.ts -- para correr local/dev, donde
//      el volumen de uploads y la DB son alcanzables directo.
//   2. src/lib/storage/actions.ts (migrateUploadsToMinioAction) -- boton en
//      /admin/configuracion, pensado para producción: la imagen Docker
//      (node:22-alpine, build standalone) no incluye la carpeta scripts/ ni
//      devDependencies como tsx, asi que el script no se puede correr
//      adentro del contenedor. Corriendo esto desde una Server Action se
//      aprovecha que el server de Next ya tiene todo lo necesario cargado
//      (conexion a la DB, cliente de MinIO, hostnames internos de Docker).
//
// Idempotente: solo toca filas cuyo receiptUrl/fileUrl todavia empieza con
// "/uploads/" (ver resolveFileUrl). Si un archivo puntual falla (por
// ejemplo, se perdio del disco), se reporta pero no frena el resto.

export type MigrationSummary = {
  receipts: { ok: number; failed: number; errors: string[] };
  customOrderFiles: { ok: number; failed: number; errors: string[] };
};

export async function runUploadsMigration(): Promise<MigrationSummary> {
  if (!isObjectStorageConfigured()) {
    throw new Error("MinIO no esta configurado (faltan MINIO_ENDPOINT/ACCESS_KEY/SECRET_KEY).");
  }

  const uploadsDir = process.env.UPLOADS_DIR ?? "./public/uploads";
  const summary: MigrationSummary = {
    receipts: { ok: 0, failed: 0, errors: [] },
    customOrderFiles: { ok: 0, failed: 0, errors: [] },
  };

  const legacyOrders = await db.select().from(orders).where(like(orders.receiptUrl, "/uploads/%"));
  for (const order of legacyOrders) {
    if (!order.receiptUrl) continue;
    try {
      // turbopackIgnore: UPLOADS_DIR viene de una env var, no de un literal
      // estatico -- sin este comentario, Turbopack no puede acotar el
      // alcance y traza (empaqueta) el proyecto entero "por las dudas" en el
      // build standalone, inflando la imagen de produccion sin necesidad.
      const localPath = path.join(/* turbopackIgnore: true */ uploadsDir, order.receiptUrl.replace(/^\/uploads\//, ""));
      const buffer = await readFile(localPath);
      const filename = path.basename(order.receiptUrl);
      const ext = filename.split(".").pop()?.toLowerCase() ?? "";
      const objectKey = `receipts/${order.id}/${filename}`;

      await uploadToStorage(objectKey, buffer, contentTypeForExtension(ext));
      await db.update(orders).set({ receiptUrl: objectKey }).where(eq(orders.id, order.id));
      summary.receipts.ok++;
    } catch (error) {
      summary.receipts.failed++;
      summary.receipts.errors.push(`orden #${order.orderNumber}: ${error instanceof Error ? error.message : error}`);
    }
  }

  const legacyCustomOrders = await db.select().from(customOrders).where(like(customOrders.fileUrl, "/uploads/%"));
  for (const customOrder of legacyCustomOrders) {
    try {
      const localPath = path.join(/* turbopackIgnore: true */ uploadsDir, customOrder.fileUrl.replace(/^\/uploads\//, ""));
      const buffer = await readFile(localPath);
      const filename = path.basename(customOrder.fileUrl);
      const ext = filename.split(".").pop()?.toLowerCase() ?? "";
      const objectKey = `custom-orders/${customOrder.id}/${filename}`;

      await uploadToStorage(objectKey, buffer, contentTypeForExtension(ext));
      await db.update(customOrders).set({ fileUrl: objectKey }).where(eq(customOrders.id, customOrder.id));
      summary.customOrderFiles.ok++;
    } catch (error) {
      summary.customOrderFiles.failed++;
      summary.customOrderFiles.errors.push(
        `pedido a medida ${customOrder.id}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  return summary;
}
