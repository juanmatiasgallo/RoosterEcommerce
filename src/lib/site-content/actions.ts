"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { auth } from "@/auth";
import type { Role } from "@/lib/auth/schema";
import { db } from "@/lib/db";
import { auditLogs, deliveryTiers, materials, services } from "@/lib/db/schema";
import { getDefaultStoreId } from "@/lib/db/store";
import {
  createDeliveryTierSchema,
  createMaterialSchema,
  createServiceSchema,
  updateDeliveryTierSchema,
  updateMaterialSchema,
  updateServiceSchema,
} from "./schema";

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

function revalidateHome() {
  revalidatePath("/");
  revalidatePath("/admin/contenido");
}

// --- Tiempos de entrega -----------------------------------------------------

export async function listDeliveryTiersForAdmin() {
  const session = await requireStaff();
  return db
    .select()
    .from(deliveryTiers)
    .where(eq(deliveryTiers.storeId, session.user.storeId))
    .orderBy(asc(deliveryTiers.sortOrder), asc(deliveryTiers.createdAt));
}

export type DeliveryTierRow = Awaited<ReturnType<typeof listDeliveryTiersForAdmin>>[number];

export async function getActiveDeliveryTiers() {
  const storeId = await getDefaultStoreId();
  return db
    .select()
    .from(deliveryTiers)
    .where(and(eq(deliveryTiers.storeId, storeId), eq(deliveryTiers.active, true)))
    .orderBy(asc(deliveryTiers.sortOrder), asc(deliveryTiers.createdAt));
}

async function getOwnedDeliveryTier(id: string, storeId: string) {
  const [row] = await db
    .select()
    .from(deliveryTiers)
    .where(and(eq(deliveryTiers.id, id), eq(deliveryTiers.storeId, storeId)))
    .limit(1);
  return row ?? null;
}

export async function createDeliveryTier(input: z.infer<typeof createDeliveryTierSchema>) {
  const session = await requireStaff();
  const data = createDeliveryTierSchema.parse(input);

  const [created] = await db
    .insert(deliveryTiers)
    .values({ storeId: session.user.storeId, ...data })
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "create",
    entityType: "delivery_tier",
    entityId: created.id,
    after: created,
  });

  revalidateHome();
  return created;
}

export async function updateDeliveryTier(id: string, input: z.infer<typeof updateDeliveryTierSchema>) {
  const session = await requireStaff();
  const data = updateDeliveryTierSchema.parse(input);

  const existing = await getOwnedDeliveryTier(id, session.user.storeId);
  if (!existing) throw new Error("Tiempo de entrega no encontrado.");

  const [updated] = await db.update(deliveryTiers).set(data).where(eq(deliveryTiers.id, id)).returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "update",
    entityType: "delivery_tier",
    entityId: id,
    before: existing,
    after: updated,
  });

  revalidateHome();
  return updated;
}

export async function deleteDeliveryTier(id: string) {
  const session = await requireStaff();

  const existing = await getOwnedDeliveryTier(id, session.user.storeId);
  if (!existing) throw new Error("Tiempo de entrega no encontrado.");

  await db.delete(deliveryTiers).where(eq(deliveryTiers.id, id));

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "delete",
    entityType: "delivery_tier",
    entityId: id,
    before: existing,
  });

  revalidateHome();
}

// --- Material ------------------------------------------------------------------

export async function listMaterialsForAdmin() {
  const session = await requireStaff();
  return db
    .select()
    .from(materials)
    .where(eq(materials.storeId, session.user.storeId))
    .orderBy(asc(materials.sortOrder), asc(materials.createdAt));
}

export type MaterialRow = Awaited<ReturnType<typeof listMaterialsForAdmin>>[number];

export async function getActiveMaterials() {
  const storeId = await getDefaultStoreId();
  return db
    .select()
    .from(materials)
    .where(and(eq(materials.storeId, storeId), eq(materials.active, true)))
    .orderBy(asc(materials.sortOrder), asc(materials.createdAt));
}

async function getOwnedMaterial(id: string, storeId: string) {
  const [row] = await db
    .select()
    .from(materials)
    .where(and(eq(materials.id, id), eq(materials.storeId, storeId)))
    .limit(1);
  return row ?? null;
}

export async function createMaterial(input: z.infer<typeof createMaterialSchema>) {
  const session = await requireStaff();
  const data = createMaterialSchema.parse(input);

  const [created] = await db
    .insert(materials)
    .values({ storeId: session.user.storeId, ...data })
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "create",
    entityType: "material",
    entityId: created.id,
    after: created,
  });

  revalidateHome();
  return created;
}

export async function updateMaterial(id: string, input: z.infer<typeof updateMaterialSchema>) {
  const session = await requireStaff();
  const data = updateMaterialSchema.parse(input);

  const existing = await getOwnedMaterial(id, session.user.storeId);
  if (!existing) throw new Error("Material no encontrado.");

  const [updated] = await db.update(materials).set(data).where(eq(materials.id, id)).returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "update",
    entityType: "material",
    entityId: id,
    before: existing,
    after: updated,
  });

  revalidateHome();
  return updated;
}

export async function deleteMaterial(id: string) {
  const session = await requireStaff();

  const existing = await getOwnedMaterial(id, session.user.storeId);
  if (!existing) throw new Error("Material no encontrado.");

  await db.delete(materials).where(eq(materials.id, id));

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "delete",
    entityType: "material",
    entityId: id,
    before: existing,
  });

  revalidateHome();
}

// --- Servicios -------------------------------------------------------------------

export async function listServicesForAdmin() {
  const session = await requireStaff();
  return db
    .select()
    .from(services)
    .where(eq(services.storeId, session.user.storeId))
    .orderBy(asc(services.sortOrder), asc(services.createdAt));
}

export type ServiceRow = Awaited<ReturnType<typeof listServicesForAdmin>>[number];

export async function getActiveServices() {
  const storeId = await getDefaultStoreId();
  return db
    .select()
    .from(services)
    .where(and(eq(services.storeId, storeId), eq(services.active, true)))
    .orderBy(asc(services.sortOrder), asc(services.createdAt));
}

async function getOwnedService(id: string, storeId: string) {
  const [row] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, id), eq(services.storeId, storeId)))
    .limit(1);
  return row ?? null;
}

export async function createService(input: z.infer<typeof createServiceSchema>) {
  const session = await requireStaff();
  const data = createServiceSchema.parse(input);

  const [created] = await db
    .insert(services)
    .values({ storeId: session.user.storeId, ...data })
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "create",
    entityType: "service",
    entityId: created.id,
    after: created,
  });

  revalidateHome();
  return created;
}

export async function updateService(id: string, input: z.infer<typeof updateServiceSchema>) {
  const session = await requireStaff();
  const data = updateServiceSchema.parse(input);

  const existing = await getOwnedService(id, session.user.storeId);
  if (!existing) throw new Error("Servicio no encontrado.");

  const [updated] = await db.update(services).set(data).where(eq(services.id, id)).returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "update",
    entityType: "service",
    entityId: id,
    before: existing,
    after: updated,
  });

  revalidateHome();
  return updated;
}

export async function deleteService(id: string) {
  const session = await requireStaff();

  const existing = await getOwnedService(id, session.user.storeId);
  if (!existing) throw new Error("Servicio no encontrado.");

  await db.delete(services).where(eq(services.id, id));

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "delete",
    entityType: "service",
    entityId: id,
    before: existing,
  });

  revalidateHome();
}
