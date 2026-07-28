"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { cartItems, productVariants, products } from "@/lib/db/schema";
import { addToCartSchema, updateCartItemSchema } from "./schema";

const GUEST_COOKIE_NAME = "cart_guest_id";
const GUEST_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 dias

// Discriminante explicito por "type" (no por nullability de userId/guestId):
// asi TypeScript narrowea de verdad cada rama sin quejarse de null.
type CartOwner = { type: "user"; userId: string } | { type: "guest"; guestId: string };

// Si hay sesion, el carrito SIEMPRE se resuelve por userId (se ignora
// cualquier cookie de invitado vieja que pudiera haber quedado de antes de
// loguearse). Sin sesion, se identifica al invitado por una cookie httpOnly,
// creandola la primera vez que hace falta.
async function resolveCartOwner(): Promise<CartOwner> {
  const session = await auth();
  if (session) {
    return { type: "user", userId: session.user.id };
  }

  const cookieStore = await cookies();
  const existing = cookieStore.get(GUEST_COOKIE_NAME)?.value;
  if (existing) {
    return { type: "guest", guestId: existing };
  }

  const guestId = randomUUID();
  cookieStore.set(GUEST_COOKIE_NAME, guestId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GUEST_COOKIE_MAX_AGE_SECONDS,
  });
  return { type: "guest", guestId };
}

function ownerCondition(owner: CartOwner) {
  return owner.type === "user" ? eq(cartItems.userId, owner.userId) : eq(cartItems.guestId, owner.guestId);
}

// Unica fuente de verdad de "esta variante se puede comprar ahora mismo":
// variante activa, producto activo. Las actions de abajo recalculan el
// stock disponible aca mismo, nunca confiando en lo que muestra el cliente.
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
  const owner = await resolveCartOwner();
  const data = addToCartSchema.parse({ variantId, quantity });

  const purchasable = await getPurchasableVariant(data.variantId);
  if (!purchasable) throw new Error("Esa variante no existe o ya no esta disponible.");

  const [existing] = await db
    .select()
    .from(cartItems)
    .where(and(ownerCondition(owner), eq(cartItems.variantId, data.variantId)))
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
        .values({
          userId: owner.type === "user" ? owner.userId : null,
          guestId: owner.type === "guest" ? owner.guestId : null,
          variantId: data.variantId,
          quantity: data.quantity,
        })
        .returning();

  revalidatePath("/carrito");
  return item;
}

export async function updateCartItem(cartItemId: string, quantity: number) {
  const owner = await resolveCartOwner();
  const data = updateCartItemSchema.parse({ quantity });

  const [existing] = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.id, cartItemId), ownerCondition(owner)))
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
  const owner = await resolveCartOwner();

  const [existing] = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.id, cartItemId), ownerCondition(owner)))
    .limit(1);
  if (!existing) throw new Error("Item de carrito no encontrado.");

  await db.delete(cartItems).where(eq(cartItems.id, cartItemId));

  revalidatePath("/carrito");
  return { id: cartItemId };
}

// Lectura scoped al dueno del carrito (usuario logueado o invitado por
// cookie) — no requiere sesion, a diferencia de como era antes.
export async function getCartItems() {
  const owner = await resolveCartOwner();

  const rows = await db
    .select({ item: cartItems, variant: productVariants, product: products })
    .from(cartItems)
    .innerJoin(productVariants, eq(productVariants.id, cartItems.variantId))
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(ownerCondition(owner))
    .orderBy(asc(cartItems.createdAt));

  // Total recalculado en el server a partir del precio real de cada
  // variante — nunca se confia en un total que pudiera venir del cliente.
  const total = rows.reduce((sum, row) => sum + Number(row.variant.price) * row.item.quantity, 0);

  return { items: rows, total };
}

export type CartRow = Awaited<ReturnType<typeof getCartItems>>["items"][number];

// Se llama explicitamente desde login-form-client.tsx justo despues de un
// signIn() exitoso — no un callback/evento de NextAuth. Se eligio asi para
// mantener la logica de fusion del carrito en el dominio "cart" (no
// mezclada en la config de auth.ts) y porque corre de forma determinista,
// garantizada, en el mismo request donde ya sabemos que el login funciono
// (un callback de NextAuth exigiria confirmar que cookies().set/delete
// tiene la misma garantia de escritura ahi, que no hacia falta arriesgar).
export async function mergeGuestCartIntoUser() {
  const session = await auth();
  if (!session) return;

  const cookieStore = await cookies();
  const guestId = cookieStore.get(GUEST_COOKIE_NAME)?.value;
  if (!guestId) return;

  const guestItems = await db.select().from(cartItems).where(eq(cartItems.guestId, guestId));

  for (const guestItem of guestItems) {
    const [existing] = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.userId, session.user.id), eq(cartItems.variantId, guestItem.variantId)))
      .limit(1);

    if (existing) {
      const purchasable = await getPurchasableVariant(guestItem.variantId);
      const combinedQuantity = existing.quantity + guestItem.quantity;
      // Se respeta el stock disponible: en vez de rechazar (no hay forma
      // razonable de mostrarle un error de validacion al usuario en medio
      // del login), se capea la cantidad combinada al stock real.
      const finalQuantity = purchasable ? Math.min(combinedQuantity, purchasable.variant.stock) : combinedQuantity;

      await db.update(cartItems).set({ quantity: finalQuantity }).where(eq(cartItems.id, existing.id));
      await db.delete(cartItems).where(eq(cartItems.id, guestItem.id));
    } else {
      await db
        .update(cartItems)
        .set({ userId: session.user.id, guestId: null })
        .where(eq(cartItems.id, guestItem.id));
    }
  }

  cookieStore.delete(GUEST_COOKIE_NAME);
  revalidatePath("/carrito");
}
