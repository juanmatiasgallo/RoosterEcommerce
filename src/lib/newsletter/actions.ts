"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { auth } from "@/auth";
import type { Role } from "@/lib/auth/schema";
import { db } from "@/lib/db";
import { newsletterSubscribers } from "@/lib/db/schema";
import { getDefaultStoreId } from "@/lib/db/store";
import { syncSubscriberToListmonk } from "./listmonk";
import { subscribeToNewsletterSchema } from "./schema";

const STAFF_ROLES: Role[] = ["admin", "empleado"];

async function requireStaff() {
  const session = await auth();
  if (!session || !STAFF_ROLES.includes(session.user.role)) {
    throw new Error("No autorizado.");
  }
  return session;
}

// Publica (no admin-gated, sin login): cualquiera desde el footer puede
// suscribirse. Idempotente — si el mail ya estaba suscrito, no tira error
// ni duplica, simplemente confirma (mejor UX que mostrar "ya existe").
export async function subscribeToNewsletter(input: z.infer<typeof subscribeToNewsletterSchema>) {
  const data = subscribeToNewsletterSchema.parse(input);
  const storeId = await getDefaultStoreId();

  const [existing] = await db
    .select({ id: newsletterSubscribers.id })
    .from(newsletterSubscribers)
    .where(and(eq(newsletterSubscribers.storeId, storeId), eq(newsletterSubscribers.email, data.email)))
    .limit(1);

  if (!existing) {
    await db.insert(newsletterSubscribers).values({ storeId, email: data.email });
    revalidatePath("/admin/newsletter");
  }

  // Se llama siempre (no solo en altas nuevas): un suscriptor ya guardado
  // localmente puede no estar sincronizado todavia (ej. si se suscribio
  // antes de que esta integracion existiera). Nunca tira excepcion -- ver
  // syncSubscriberToListmonk.
  await syncSubscriberToListmonk(storeId, data.email);

  return { subscribed: true as const };
}

export async function listNewsletterSubscribers() {
  const session = await requireStaff();

  return db
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.storeId, session.user.storeId))
    .orderBy(desc(newsletterSubscribers.createdAt));
}

export type NewsletterSubscriberRow = Awaited<ReturnType<typeof listNewsletterSubscribers>>[number];
