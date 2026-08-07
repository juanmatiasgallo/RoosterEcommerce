import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Readable } from "node:stream";

// Storage de objetos (MinIO, self-hosted, API compatible con S3) para
// archivos subidos por usuarios: comprobantes de pago (orders.receiptUrl) y
// STL/OBJ de pedidos a medida (customOrders.fileUrl). Antes vivian en un
// volumen local (ver UPLOADS_DIR en orders/actions.ts y
// custom-orders/actions.ts) -- ese modo sigue soportado para lo viejo (ver
// resolveFileUrl mas abajo), pero todo upload nuevo entra por aca.
//
// Conexion perezosa (mismo criterio que src/lib/db/index.ts): no valida las
// env vars al importar el modulo, solo cuando efectivamente se usa. Asi el
// build no se rompe en entornos donde MinIO todavia no esta configurado.

const BUCKET = process.env.MINIO_BUCKET ?? "tienda3d";
const SIGNED_URL_EXPIRES_SECONDS = 60 * 60; // 1 hora -- suficiente para que el admin/cliente abra el link desde la pagina recien cargada, sin dejarlo indefinidamente accesible (bucket privado).

let client: S3Client | null = null;

export function isObjectStorageConfigured(): boolean {
  return Boolean(process.env.MINIO_ENDPOINT && process.env.MINIO_ACCESS_KEY && process.env.MINIO_SECRET_KEY);
}

function getClient(): S3Client {
  if (!isObjectStorageConfigured()) {
    throw new Error(
      "MinIO no esta configurado (faltan MINIO_ENDPOINT / MINIO_ACCESS_KEY / MINIO_SECRET_KEY en el entorno).",
    );
  }
  if (!client) {
    client = new S3Client({
      endpoint: process.env.MINIO_ENDPOINT,
      region: process.env.MINIO_REGION ?? "us-east-1", // MinIO ignora la region real, pero el SDK de S3 exige que exista algun valor.
      forcePathStyle: true, // MinIO necesita direccionamiento por path (bucket.tudominio.com no aplica aca), a diferencia de AWS S3 real.
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY!,
        secretAccessKey: process.env.MINIO_SECRET_KEY!,
      },
    });
  }
  return client;
}

export async function uploadToStorage(key: string, buffer: Buffer, contentType: string): Promise<void> {
  await getClient().send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: contentType }),
  );
}

export async function getSignedFileUrl(key: string): Promise<string> {
  return getSignedUrl(getClient(), new GetObjectCommand({ Bucket: BUCKET, Key: key }), {
    expiresIn: SIGNED_URL_EXPIRES_SECONDS,
  });
}

// Lee los bytes de un objeto directo (sin URL firmada, sin exponer
// credenciales al navegador) -- para el unico caso donde algo del bucket
// privado necesita servirse por una URL PUBLICA y estable (el icono de
// marca, ver /api/branding/icon): ese route.ts llama esto server-side con
// las credenciales de la app y reenvia los bytes el mismo con su propio
// Cache-Control, evitando el vencimiento de 1h de getSignedFileUrl (que
// rompe un favicon o un <img> que el navegador cachea de por vida).
export async function getObjectBuffer(key: string): Promise<{ buffer: Buffer; contentType: string | undefined }> {
  const result = await getClient().send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const stream = result.Body as Readable;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return { buffer: Buffer.concat(chunks), contentType: result.ContentType };
}

// Un solo punto de entrada para resolver lo que sea que este guardado en
// orders.receiptUrl / customOrders.fileUrl a una URL que el navegador pueda
// abrir. Heuristica por prefijo: los valores viejos (pre-MinIO) arrancan con
// "/uploads/" y se sirven tal cual (archivo estatico de Next, publico); todo
// lo demas se interpreta como una key de objeto en MinIO (ej.
// "receipts/{orderId}/uuid.pdf") y necesita una URL firmada porque el bucket
// es privado. No hace falta tocar filas viejas en la DB para que esto siga
// funcionando -- conviven los dos formatos hasta que se migran (ver
// scripts/migrate-uploads-to-minio.ts).
export async function resolveFileUrl(stored: string | null | undefined): Promise<string | null> {
  if (!stored) return null;
  if (stored.startsWith("/uploads/") || stored.startsWith("http://") || stored.startsWith("https://")) {
    return stored;
  }
  return getSignedFileUrl(stored);
}

export type StorageObject = { key: string; size: number; lastModified: Date };

// Lista todos los objetos bajo un prefijo (ej. "receipts/{orderId}/") -- la
// forma de "buscar archivos por pedido" sin mantener un indice aparte: la
// key ya codifica el pedido al que pertenece.
export async function listFilesByPrefix(prefix: string): Promise<StorageObject[]> {
  if (!isObjectStorageConfigured()) return [];
  const result = await getClient().send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix }));
  return (result.Contents ?? [])
    .filter((obj): obj is typeof obj & { Key: string } => Boolean(obj.Key))
    .map((obj) => ({ key: obj.Key, size: obj.Size ?? 0, lastModified: obj.LastModified ?? new Date() }));
}

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  stl: "model/stl",
  obj: "text/plain",
};

export function contentTypeForExtension(ext: string): string {
  return CONTENT_TYPES[ext.toLowerCase()] ?? "application/octet-stream";
}
