"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, avg, count, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { auditLogs, orderItems, orders, productReviews, productVariants, users } from "@/lib/db/schema";
import { UPLOAD_IMAGE_ALLOWED_EXTENSIONS } from "@/lib/catalog/schema";
import { createReviewSchema } from "./schema";
import type { z } from "zod";

// Hasta 5 fotos por reseña — suficiente para mostrar el producto recibido
// sin permitir un abuso de espacio en disco (mismo volumen persistente que
// usan las imagenes de producto y los comprobantes de pago, ver CLAUDE.md).
const MAX_REVIEW_IMAGES = 5;

// Una orden cuenta como "compra" habilitante para reseñar recien cuando el
// pago esta confirmado (pagado en adelante) — "pendiente_pago" y
// "pendiente_confirmacion" no cuentan, "cancelado" tampoco.
const PURCHASED_STATUSES = ["pagado", "en_cola", "imprimiendo", "postprocesado", "enviado", "entregado"] as const;

async function logAudit(params: {
  userId: string;
  storeId: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
}) {
  await db.insert(auditLogs).values({
    storeId: params.storeId,
    userId: params.userId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    before: params.before ?? null,
    after: params.after ?? null,
  });
}

// Lectura publica: promedio + cantidad + listado, para la ficha de producto.
export async function getProductReviews(productId: string) {
  const [summary] = await db
    .select({ average: avg(productReviews.rating), total: count(productReviews.id) })
    .from(productReviews)
    .where(eq(productReviews.productId, productId));

  const reviews = await db
    .select({ review: productReviews, userName: users.name })
    .from(productReviews)
    .innerJoin(users, eq(users.id, productReviews.userId))
    .where(eq(productReviews.productId, productId))
    .orderBy(desc(productReviews.createdAt));

  return {
    average: summary?.average ? Number(summary.average) : 0,
    total: summary?.total ?? 0,
    reviews,
  };
}

export type ProductReviewsSummary = Awaited<ReturnType<typeof getProductReviews>>;

// Si el usuario logueado puede dejar reseña de este producto: tiene que
// tener al menos una orden pagada que incluya una variante de este producto,
// y no haber reseñado ya (unique product_id+user_id en el schema).
export async function getReviewEligibility(productId: string) {
  const session = await auth();
  if (!session) return { canReview: false as const, reason: "not_logged_in" as const };

  const [existing] = await db
    .select({ id: productReviews.id })
    .from(productReviews)
    .where(and(eq(productReviews.productId, productId), eq(productReviews.userId, session.user.id)))
    .limit(1);
  if (existing) return { canReview: false as const, reason: "already_reviewed" as const };

  const purchased = await hasVerifiedPurchase(session.user.id, productId);
  if (!purchased) return { canReview: false as const, reason: "not_purchased" as const };

  return { canReview: true as const };
}

async function hasVerifiedPurchase(userId: string, productId: string) {
  const variantRows = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(eq(productVariants.productId, productId));
  if (variantRows.length === 0) return false;
  const variantIds = variantRows.map((v) => v.id);

  const rows = await db
    .select({ orderId: orders.id })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(
      and(
        eq(orders.userId, userId),
        inArray(orders.status, PURCHASED_STATUSES),
        inArray(orderItems.variantId, variantIds),
      ),
    )
    .limit(1);

  return rows.length > 0;
}

export async function createReview(
  productId: string,
  input: z.infer<typeof createReviewSchema>,
  productSlug?: string,
  // Fotos opcionales que el cliente adjunta con la reseña (task #104). Se
  // suben aca mismo, en la misma llamada, en vez de un flujo separado tipo
  // uploadPaymentReceipt: una reseña no tiene una pantalla de edicion
  // posterior donde volver a subirlas, asi que no tiene sentido separarlo
  // en dos pasos.
  files?: File[],
) {
  const session = await auth();
  if (!session) throw new Error("Debes iniciar sesion para dejar una reseña.");

  const data = createReviewSchema.parse(input);

  // Defensa en profundidad: no confiar en que el boton de "dejar reseña"
  // solo se muestra a usuarios elegibles — revalidar server-side.
  const eligibility = await getReviewEligibility(productId);
  if (!eligibility.canReview) {
    const message =
      eligibility.reason === "already_reviewed"
        ? "Ya dejaste una reseña para este producto."
        : "Solo podes reseñar productos que hayas comprado.";
    throw new Error(message);
  }

  const imageFiles = (files ?? []).filter((file) => file.size > 0).slice(0, MAX_REVIEW_IMAGES);
  for (const file of imageFiles) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!UPLOAD_IMAGE_ALLOWED_EXTENSIONS.includes(ext)) {
      throw new Error(`Extension no permitida en las fotos. Usa: ${UPLOAD_IMAGE_ALLOWED_EXTENSIONS.join(", ")}.`);
    }
    const maxSizeMb = Number(process.env.UPLOADS_MAX_SIZE_MB ?? 20);
    if (file.size > maxSizeMb * 1024 * 1024) {
      throw new Error(`Una de las fotos supera el tamano maximo permitido (${maxSizeMb} MB).`);
    }
  }

  let imageUrls: string[] = [];
  if (imageFiles.length > 0) {
    const uploadsDir = process.env.UPLOADS_DIR ?? "./public/uploads";
    const reviewsDir = path.resolve(uploadsDir, "reviews");
    await mkdir(reviewsDir, { recursive: true });

    imageUrls = await Promise.all(
      imageFiles.map(async (file) => {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        const filename = `${randomUUID()}.${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(path.join(reviewsDir, filename), buffer);
        return `/uploads/reviews/${filename}`;
      }),
    );
  }

  const [review] = await db
    .insert(productReviews)
    .values({
      storeId: session.user.storeId,
      productId,
      userId: session.user.id,
      rating: data.rating,
      comment: data.comment || null,
      images: imageUrls.length > 0 ? imageUrls : null,
      verifiedPurchase: true,
    })
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "create",
    entityType: "product_review",
    entityId: review.id,
    after: review,
  });

  if (productSlug) revalidatePath(`/producto/${productSlug}`);

  return review;
}
