"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { auth } from "@/auth";
import type { Role } from "@/lib/auth/schema";
import { db } from "@/lib/db";
import { auditLogs, discountCampaigns } from "@/lib/db/schema";
import { getDefaultStoreId } from "@/lib/db/store";
import { getCartItems } from "@/lib/cart/actions";
import { createDiscountCampaignSchema, updateDiscountCampaignSchema } from "./schema";

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

export async function listDiscountCampaignsForAdmin() {
  const session = await requireStaff();
  return db
    .select()
    .from(discountCampaigns)
    .where(eq(discountCampaigns.storeId, session.user.storeId))
    .orderBy(desc(discountCampaigns.createdAt));
}

export type DiscountCampaignRow = Awaited<ReturnType<typeof listDiscountCampaignsForAdmin>>[number];

async function getOwnedCampaign(id: string, storeId: string) {
  const [row] = await db
    .select()
    .from(discountCampaigns)
    .where(and(eq(discountCampaigns.id, id), eq(discountCampaigns.storeId, storeId)))
    .limit(1);
  return row ?? null;
}

export async function createDiscountCampaign(input: z.infer<typeof createDiscountCampaignSchema>) {
  const session = await requireStaff();
  const data = createDiscountCampaignSchema.parse(input);
  const code = data.code.trim().toUpperCase();

  const [existing] = await db
    .select({ id: discountCampaigns.id })
    .from(discountCampaigns)
    .where(eq(discountCampaigns.code, code))
    .limit(1);
  if (existing) throw new Error("Ya existe un codigo de promocion con ese nombre.");

  const [created] = await db
    .insert(discountCampaigns)
    .values({
      storeId: session.user.storeId,
      code,
      type: data.type,
      value: data.value.toFixed(2),
      usageLimit: data.usageLimit ?? null,
    })
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "create",
    entityType: "discount_campaign",
    entityId: created.id,
    after: created,
  });

  revalidatePath("/admin/ofertas");
  return created;
}

export async function updateDiscountCampaign(id: string, input: z.infer<typeof updateDiscountCampaignSchema>) {
  const session = await requireStaff();
  const data = updateDiscountCampaignSchema.parse(input);

  const existing = await getOwnedCampaign(id, session.user.storeId);
  if (!existing) throw new Error("Codigo de promocion no encontrado.");

  const [updated] = await db
    .update(discountCampaigns)
    .set({
      ...(data.type !== undefined && { type: data.type }),
      ...(data.value !== undefined && { value: data.value.toFixed(2) }),
      ...(data.usageLimit !== undefined && { usageLimit: data.usageLimit }),
      ...(data.active !== undefined && { active: data.active }),
    })
    .where(eq(discountCampaigns.id, id))
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "update",
    entityType: "discount_campaign",
    entityId: id,
    before: existing,
    after: updated,
  });

  revalidatePath("/admin/ofertas");
  return updated;
}

export async function deleteDiscountCampaign(id: string) {
  const session = await requireStaff();

  const existing = await getOwnedCampaign(id, session.user.storeId);
  if (!existing) throw new Error("Codigo de promocion no encontrado.");

  await db.delete(discountCampaigns).where(eq(discountCampaigns.id, id));

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "delete",
    entityType: "discount_campaign",
    entityId: id,
    before: existing,
  });

  revalidatePath("/admin/ofertas");
}

// Busca un codigo de campania activo, con cupo disponible, de esta tienda.
// Reusado tanto por el preview del checkout (abajo) como por checkoutCart
// (src/lib/orders/actions.ts) al confirmar la compra -- misma condicion en
// los dos lugares para que "valido en el preview" siempre implique "valido
// al pagar" (salvo que alguien mas agote el cupo justo en el medio).
export async function findUsableCampaign(code: string, storeId: string) {
  const [campaign] = await db
    .select()
    .from(discountCampaigns)
    .where(
      and(
        eq(discountCampaigns.code, code.trim().toUpperCase()),
        eq(discountCampaigns.storeId, storeId),
        eq(discountCampaigns.active, true),
      ),
    )
    .limit(1);
  if (!campaign) return null;
  if (campaign.usageLimit !== null && campaign.usageCount >= campaign.usageLimit) return null;
  return campaign;
}

export function computeCampaignDiscount(campaign: { type: "percent" | "fixed"; value: string }, subtotal: number) {
  const value = Number(campaign.value);
  const raw = campaign.type === "percent" ? subtotal * (value / 100) : value;
  return Math.min(Math.max(0, raw), subtotal);
}

// Preview publico (sin requireStaff -- lo usa cualquier visitante en
// /checkout, con o sin cuenta): valida el codigo contra el carrito actual y
// devuelve el descuento que tendria, sin crear ninguna orden ni consumir
// cupo todavia (eso recien pasa en checkoutCart, al confirmar de verdad).
export async function previewDiscountCode(code: string) {
  const trimmed = code.trim();
  if (!trimmed) throw new Error("Ingresa un codigo.");

  const storeId = await getDefaultStoreId();
  const campaign = await findUsableCampaign(trimmed, storeId);
  if (!campaign) throw new Error("Ese codigo no es valido, esta inactivo o ya se agoto.");

  const { total } = await getCartItems();
  if (total <= 0) throw new Error("Tu carrito esta vacio.");

  const discountAmount = computeCampaignDiscount(campaign, total);
  return { code: campaign.code, type: campaign.type, value: Number(campaign.value), discountAmount };
}
