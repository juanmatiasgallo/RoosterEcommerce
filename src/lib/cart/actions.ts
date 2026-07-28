"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { cartItems, productVariants, products } from "@/lib/db/schema";
import { addToCartSchema, updateCartItemSchema } from "./schema";

async function requireUser() {
  const session = await auth();
  if (!session) throw new Error("Debes iniciar sesion para usar el carrito.");
  return session;
}

// Unica fuente de verdad de "esta variante se puede comprar ahora mismo":
// variante activa, producto activo. addToCart/updateCartItem recalculan el
// stock disponible acá mismo, nunca confiando en lo que muestra el cliente.
async function getPurchasableVariant(variantId: string) {
  const [row] = await db
    .select({ variant: productVariants, product: products })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(and(eq(productVariants.id, variantId), eq(productVariants.active, true), eq(products.active, true)))
    .limit(1);
  return row;
}

export async function addToCart(variantId: string, quantity: number) {
  const session = await requireUser();
  const data = addToCartSchema.parse({ variantId, quantity });

  const purchasable = await getPurchasableVariant(data.variantId);
  if (!purchasable) throw new Error("Esa variante no existe o ya no esta disponible.");

  const [existing] = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.userId, session.user.id), eq(cartItems.variantId, data.variantId)))
    .limit(1);

  // Si ya habia una fila para esta variante, se suma en vez de duplicar.
  const nextQuantity = (existing?.quantity ?? 0) + data.quantity;
  if (nextQuantity > purchasable.variant.stock) {
    throw new Error(`Solo hay ${purchasable.variant.stock} unidades disponibles.`);
  }

  const [item] = existing
    ? await db.update(cartItems).set({ quantity: nextQuantity }).where(eq(cartItems.id, existing.id)).returning()
    : await db
        .insert(cartItems)
        .values({ userId: session.user.id, variantId: data.variantId, quantity: data.quantity })
        .returning();

  revalidatePath("/carrito");
  return item;
}

export async function updateCartItem(cartItemId: string, quantity: number) {
  const session = await requireUser();
  const data = updateCartItemSchema.parse({ quantity });

  const [existing] = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.id, cartItemId), eq(cartItems.userId, session.user.id)))
    .limit(1);
  if (!existing) throw new Error("Item de carrito no encontrado.");

  const purchasable = await getPurchasableVariant(existing.variantId);
  if (!purchasable) throw new Error("Esa variante ya no esta disponible.");
  if (data.quantity > purchasable.variant.stock) {
    throw new Error(`Solo hay ${purchasable.variant.stock} unidades disponibles.`);
  }

  const [updated] = await db
    .update(cartItems)
    .set({ quantity: data.quantity })
    .where(eq(cartItems.id, cartItemId))
    .returning();

  revalidatePath("/carrito");
  return updated;
}

export async function removeFromCart(cartItemId: string) {
  const session = await requireUser();

  const [existing] = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.id, cartItemId), eq(cartItems.userId, session.user.id)))
    .limit(1);
  if (!existing) throw new Error("Item de carrito no encontrado.");

  await db.delete(cartItems).where(eq(cartItems.id, cartItemId));

  revalidatePath("/carrito");
  return { id: cartItemId };
}

// Lectura scoped al usuario logueado (no hay catalogo publico involucrado
// aca, por eso vive junto a las mutaciones guardadas y no en un queries.ts
// separado sin auth).
export async function getCartItems() {
  const session = await requireUser();

  const rows = await db
    .select({ item: cartItems, variant: productVariants, product: products })
    .from(cartItems)
    .innerJoin(productVariants, eq(productVariants.id, cartItems.variantId))
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(eq(cartItems.userId, session.user.id))
    .orderBy(asc(cartItems.createdAt));

  // Total recalculado en el server a partir del precio real de cada
  // variante — nunca se confia en un total que pudiera venir del cliente.
  const total = rows.reduce((sum, row) => sum + Number(row.variant.price) * row.item.quantity, 0);

  return { items: rows, total };
}

export type CartRow = Awaited<ReturnType<typeof getCartItems>>["items"][number];
