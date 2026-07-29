"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { favorites } from "@/lib/db/schema";
import { listProductsByIds } from "@/lib/catalog/queries";

// Favoritos son solo para usuarios logueados (ver comentario en schema.ts):
// a diferencia de getCartItems, esto NO crea nada para un invitado — si no
// hay sesion, se devuelve vacio en vez de tirar error, para que las
// pantallas publicas (product-card en el home) puedan llamarlo sin tener
// que chequear sesion antes.
export async function getMyFavoriteProductIds(): Promise<string[]> {
  const session = await auth();
  if (!session) return [];

  const rows = await db
    .select({ productId: favorites.productId })
    .from(favorites)
    .where(eq(favorites.userId, session.user.id));

  return rows.map((row) => row.productId);
}

// Alterna favorito/no-favorito para un producto. Requiere sesion (a
// diferencia de la lectura de arriba) porque es una escritura real.
export async function toggleFavorite(productId: string): Promise<{ favorited: boolean }> {
  const session = await auth();
  if (!session) throw new Error("Inicia sesion para guardar favoritos.");

  const [existing] = await db
    .select({ id: favorites.id })
    .from(favorites)
    .where(and(eq(favorites.userId, session.user.id), eq(favorites.productId, productId)))
    .limit(1);

  if (existing) {
    await db.delete(favorites).where(eq(favorites.id, existing.id));
    revalidatePath("/mi-cuenta/favoritos");
    return { favorited: false };
  }

  await db.insert(favorites).values({
    storeId: session.user.storeId,
    userId: session.user.id,
    productId,
  });
  revalidatePath("/mi-cuenta/favoritos");
  return { favorited: true };
}

// Para /mi-cuenta/favoritos: reusa listProductsByIds (mismo shape de
// ProductListItem que usa ProductCard en todo el sitio) en vez de duplicar
// la query de thumbnail/precio/stock.
export async function getMyFavoriteProducts() {
  const session = await auth();
  if (!session) return [];

  const rows = await db
    .select({ productId: favorites.productId })
    .from(favorites)
    .where(eq(favorites.userId, session.user.id))
    .orderBy(desc(favorites.createdAt));

  return listProductsByIds(rows.map((row) => row.productId));
}
