"use server";

import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull, sum } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { discountCoupons, loyaltyPoints, stores } from "@/lib/db/schema";
import { redeemLoyaltyPointsSchema } from "./schema";

// Ledger simple (ver comentario en schema.ts): el saldo no se guarda en
// ninguna columna, se calcula sumando earned y restando redeemed cada vez
// que se pide. Con el volumen de una tienda chica esto es mas simple y mas
// dificil de desincronizar que mantener un contador aparte.
export async function getMyLoyaltyBalance(): Promise<number> {
  const session = await auth();
  if (!session) return 0;

  const [earnedRow] = await db
    .select({ total: sum(loyaltyPoints.points) })
    .from(loyaltyPoints)
    .where(and(eq(loyaltyPoints.userId, session.user.id), eq(loyaltyPoints.type, "earned")));
  const [redeemedRow] = await db
    .select({ total: sum(loyaltyPoints.points) })
    .from(loyaltyPoints)
    .where(and(eq(loyaltyPoints.userId, session.user.id), eq(loyaltyPoints.type, "redeemed")));

  const earned = Number(earnedRow?.total ?? 0);
  const redeemed = Number(redeemedRow?.total ?? 0);
  return Math.max(0, earned - redeemed);
}

// Historial completo (earned + redeemed) para mostrar en /mi-cuenta/puntos,
// mas reciente primero.
export async function getMyLoyaltyHistory() {
  const session = await auth();
  if (!session) return [];

  return db
    .select()
    .from(loyaltyPoints)
    .where(eq(loyaltyPoints.userId, session.user.id))
    .orderBy(desc(loyaltyPoints.createdAt));
}

export type LoyaltyPointRow = Awaited<ReturnType<typeof getMyLoyaltyHistory>>[number];

// Corto y facil de tipear/leer por telefono (mismo criterio que
// generateVariantSku en catalog/actions.ts): prefijo fijo + 6 caracteres
// random en mayuscula. La unicidad real la garantiza la columna `code`
// unique, esto solo reduce las chances de choque.
function generateCouponCode(): string {
  const suffix = randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  return `PUNTOS-${suffix}`;
}

// Canjea puntos del usuario logueado por un cupon de descuento de un solo
// uso. La tasa (loyaltyPointValue, $ por punto) es la vigente en el momento
// del canje. No se permite canjear si el sistema esta apagado (rate = 0) o
// si el usuario no tiene puntos suficientes.
export async function redeemLoyaltyPoints(input: z.infer<typeof redeemLoyaltyPointsSchema>) {
  const session = await auth();
  if (!session) throw new Error("Inicia sesion para canjear puntos.");

  const data = redeemLoyaltyPointsSchema.parse(input);

  const [store] = await db
    .select({ loyaltyPointValue: stores.loyaltyPointValue })
    .from(stores)
    .where(eq(stores.id, session.user.storeId))
    .limit(1);
  const pointValue = Number(store?.loyaltyPointValue ?? 0);
  if (pointValue <= 0) throw new Error("El canje de puntos no esta disponible por ahora.");

  const balance = await getMyLoyaltyBalance();
  if (data.points > balance) throw new Error(`No tenes suficientes puntos (tenes ${balance}).`);

  const amount = data.points * pointValue;
  const code = generateCouponCode();

  // Transaccion: si la fila del ledger fallara despues de crear el cupon
  // (o al reves), no queremos un cupon "gratis" sin el debito de puntos que
  // le corresponde.
  const coupon = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(discountCoupons)
      .values({
        storeId: session.user.storeId,
        userId: session.user.id,
        code,
        amount: amount.toFixed(2),
        pointsSpent: data.points,
      })
      .returning();

    await tx.insert(loyaltyPoints).values({
      storeId: session.user.storeId,
      userId: session.user.id,
      type: "redeemed",
      points: data.points,
      note: `Canjeado por cupon ${code}`,
    });

    return created;
  });

  revalidatePath("/mi-cuenta/puntos");

  return coupon;
}

// Cupones sin usar del usuario logueado, para elegir uno en el checkout o
// verlos listados en /mi-cuenta/puntos.
export async function getMyCoupons() {
  const session = await auth();
  if (!session) return [];

  return db
    .select()
    .from(discountCoupons)
    .where(and(eq(discountCoupons.userId, session.user.id), isNull(discountCoupons.usedAt)))
    .orderBy(desc(discountCoupons.createdAt));
}

export type CouponRow = Awaited<ReturnType<typeof getMyCoupons>>[number];
