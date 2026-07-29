"use server";

import { and, count, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import type { Role } from "@/lib/auth/schema";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

const STAFF_ROLES: Role[] = ["admin", "empleado"];

// Cliente: solo las suyas (recipientUserId = su id). Staff: las
// "para todo el staff" de su tienda (recipientUserId nulo) — nunca las de
// un cliente puntual, aunque comparta storeId.
function scopeCondition(userId: string, storeId: string, role: Role) {
  if (STAFF_ROLES.includes(role)) {
    return and(eq(notifications.storeId, storeId), isNull(notifications.recipientUserId));
  }
  return eq(notifications.recipientUserId, userId);
}

const RECENT_LIMIT = 15;

export async function getNotificationSummary() {
  const session = await auth();
  if (!session) return { items: [], unreadCount: 0 };

  const condition = scopeCondition(session.user.id, session.user.storeId, session.user.role);

  const [items, unread] = await Promise.all([
    db.select().from(notifications).where(condition).orderBy(desc(notifications.createdAt)).limit(RECENT_LIMIT),
    db
      .select({ value: count() })
      .from(notifications)
      .where(and(condition, isNull(notifications.readAt))),
  ]);

  return { items, unreadCount: unread[0]?.value ?? 0 };
}

export type NotificationSummary = Awaited<ReturnType<typeof getNotificationSummary>>;

export async function markNotificationRead(id: string) {
  const session = await auth();
  if (!session) throw new Error("Debes iniciar sesion.");

  const condition = scopeCondition(session.user.id, session.user.storeId, session.user.role);

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), condition));

  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead() {
  const session = await auth();
  if (!session) throw new Error("Debes iniciar sesion.");

  const condition = scopeCondition(session.user.id, session.user.storeId, session.user.role);

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(condition, isNull(notifications.readAt)));

  revalidatePath("/", "layout");
}
