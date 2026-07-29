"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { auth } from "@/auth";
import type { Role } from "@/lib/auth/schema";
import { db } from "@/lib/db";
import { auditLogs, shippingZones } from "@/lib/db/schema";
import { getDefaultStoreId } from "@/lib/db/store";
import { createShippingZoneSchema, reorderShippingZonesSchema, updateShippingZoneSchema } from "./schema";

const STAFF_ROLES: Role[] = ["admin", "empleado"];

async function requireStaff() {
  const session = await auth();
  if (!session || !STAFF_ROLES.includes(session.user.role)) {
    throw new Error("No autorizado.");
  }
  return session;
}

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

async function getOwnedZone(id: string, storeId: string) {
  const [zone] = await db
    .select()
    .from(shippingZones)
    .where(and(eq(shippingZones.id, id), eq(shippingZones.storeId, storeId)))
    .limit(1);
  return zone ?? null;
}

export async function listShippingZonesForAdmin() {
  const session = await requireStaff();

  return db
    .select()
    .from(shippingZones)
    .where(eq(shippingZones.storeId, session.user.storeId))
    .orderBy(asc(shippingZones.position), asc(shippingZones.name));
}

export type ShippingZoneRow = Awaited<ReturnType<typeof listShippingZonesForAdmin>>[number];

// Publica (no admin-gated): la pagina /envios y el checkout necesitan
// mostrar solo las zonas activas, sin requerir sesion de admin.
export async function listActiveShippingZones() {
  const storeId = await getDefaultStoreId();

  return db
    .select()
    .from(shippingZones)
    .where(and(eq(shippingZones.storeId, storeId), eq(shippingZones.active, true)))
    .orderBy(asc(shippingZones.position), asc(shippingZones.name));
}

export async function createShippingZone(input: z.infer<typeof createShippingZoneSchema>) {
  const session = await requireStaff();
  const data = createShippingZoneSchema.parse(input);

  const [created] = await db
    .insert(shippingZones)
    .values({
      storeId: session.user.storeId,
      name: data.name,
      description: data.description || null,
      cost: data.cost.toFixed(2),
    })
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "create",
    entityType: "shipping_zone",
    entityId: created.id,
    after: created,
  });

  revalidatePath("/admin/configuracion");
  revalidatePath("/envios");
  return created;
}

export async function updateShippingZone(id: string, input: z.infer<typeof updateShippingZoneSchema>) {
  const session = await requireStaff();
  const data = updateShippingZoneSchema.parse(input);

  const existing = await getOwnedZone(id, session.user.storeId);
  if (!existing) throw new Error("Zona de envio no encontrada.");

  const [updated] = await db
    .update(shippingZones)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description || null }),
      ...(data.cost !== undefined && { cost: data.cost.toFixed(2) }),
      ...(data.active !== undefined && { active: data.active }),
    })
    .where(eq(shippingZones.id, id))
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "update",
    entityType: "shipping_zone",
    entityId: id,
    before: existing,
    after: updated,
  });

  revalidatePath("/admin/configuracion");
  revalidatePath("/envios");
  return updated;
}

export async function deleteShippingZone(id: string) {
  const session = await requireStaff();

  const existing = await getOwnedZone(id, session.user.storeId);
  if (!existing) throw new Error("Zona de envio no encontrada.");

  await db.delete(shippingZones).where(eq(shippingZones.id, id));

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "delete",
    entityType: "shipping_zone",
    entityId: id,
    before: existing,
  });

  revalidatePath("/admin/configuracion");
  revalidatePath("/envios");
}

export async function reorderShippingZones(items: z.infer<typeof reorderShippingZonesSchema>) {
  const session = await requireStaff();
  const parsed = reorderShippingZonesSchema.parse(items);

  const ids = parsed.map((item) => item.id);
  const owned = await db
    .select({ id: shippingZones.id })
    .from(shippingZones)
    .where(and(eq(shippingZones.storeId, session.user.storeId)));
  const ownedIds = new Set(owned.map((row) => row.id));
  if (!ids.every((id) => ownedIds.has(id))) {
    throw new Error("Alguna zona no pertenece a la tienda.");
  }

  for (const item of parsed) {
    await db.update(shippingZones).set({ position: item.position }).where(eq(shippingZones.id, item.id));
  }

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "reorder",
    entityType: "shipping_zone",
    after: parsed,
  });

  revalidatePath("/admin/configuracion");
  revalidatePath("/envios");
  return parsed;
}
