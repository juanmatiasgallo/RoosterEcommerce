"use server";

import bcrypt from "bcryptjs";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { auditLogs, users } from "@/lib/db/schema";
import { getDefaultStoreId } from "@/lib/db/store";
import { adminCreateUserSchema, adminUpdateUserSchema } from "./schema";

// A diferencia del molde CRUD habitual (admin + empleado), crear cuentas de
// admin/empleado es mas sensible que el resto del panel (da acceso al
// propio panel) — por eso el guard es admin-only, mismo criterio que
// src/lib/settings/actions.ts.
async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    throw new Error("No autorizado.");
  }
  return session;
}

export async function adminCreateUser(input: z.infer<typeof adminCreateUserSchema>) {
  const session = await requireAdmin();
  const data = adminCreateUserSchema.parse(input);

  // Defensa explicita ademas del enum de Zod (que ya excluye "cliente" del
  // tipo): documenta la regla y sobrevive a cualquier cambio futuro del
  // schema que la relaje sin querer.
  if ((data.role as string) === "cliente") {
    throw new Error("No se puede crear un cliente desde este formulario.");
  }

  const email = data.email.toLowerCase();

  // Mismo criterio case-insensitive que src/auth.ts y registerUser.
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    throw new Error("Ese email ya esta registrado.");
  }

  const storeId = await getDefaultStoreId();
  // Mismo costo que src/lib/db/bootstrap-admin.ts.
  const passwordHash = await bcrypt.hash(data.password, 10);

  const [created] = await db
    .insert(users)
    .values({
      storeId,
      name: data.name,
      email,
      passwordHash,
      role: data.role,
    })
    .returning();

  await db.insert(auditLogs).values({
    storeId,
    userId: session.user.id,
    action: "admin_create_user",
    entityType: "user",
    entityId: created.id,
    after: { id: created.id, email: created.email, name: created.name, role: created.role },
  });

  revalidatePath("/admin/usuarios");

  return { id: created.id, email: created.email, name: created.name, role: created.role };
}

export async function listUsers() {
  const session = await requireAdmin();

  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      active: users.active,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.storeId, session.user.storeId))
    .orderBy(desc(users.createdAt));
}

export type AdminUserListItem = Awaited<ReturnType<typeof listUsers>>[number];

// Trae el registro entero (scoped a storeId) para verificar pertenencia
// antes de mutar -- mismo criterio de "verificar que el registro pertenece
// a la tienda" que pide CLAUDE.md para cualquier edicion/borrado por id.
async function getOwnedUser(id: string, storeId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user || user.storeId !== storeId) {
    throw new Error("Usuario no encontrado.");
  }
  return user;
}

// Edicion de datos basicos de cualquier usuario (cliente o staff) desde el
// panel (task #22: antes el admin no tenia ninguna opcion para tocar los
// datos de un cliente). No permite tocar email/rol/contrasena, ver
// adminUpdateUserSchema.
export async function adminUpdateUser(id: string, input: z.infer<typeof adminUpdateUserSchema>) {
  const session = await requireAdmin();
  const data = adminUpdateUserSchema.parse(input);
  const target = await getOwnedUser(id, session.user.storeId);

  const [updated] = await db
    .update(users)
    .set({ name: data.name, phone: data.phone ? data.phone : null })
    .where(eq(users.id, id))
    .returning();

  await db.insert(auditLogs).values({
    storeId: session.user.storeId,
    userId: session.user.id,
    action: "admin_update_user",
    entityType: "user",
    entityId: id,
    before: { name: target.name, phone: target.phone },
    after: { name: updated.name, phone: updated.phone },
  });

  revalidatePath("/admin/usuarios");

  return { id: updated.id, name: updated.name, phone: updated.phone };
}

// "Eliminar" un cliente = desactivar (soft delete), mismo criterio que
// productos/variantes en CLAUDE.md: preserva el historial de ordenes y
// permite reactivar. src/auth.ts ya bloquea el login si !user.active, asi
// que este toggle es suficiente para bloquear el acceso de inmediato.
export async function adminSetUserActive(id: string, active: boolean) {
  const session = await requireAdmin();

  if (id === session.user.id && !active) {
    throw new Error("No podes desactivar tu propia cuenta.");
  }

  const target = await getOwnedUser(id, session.user.storeId);

  const [updated] = await db.update(users).set({ active }).where(eq(users.id, id)).returning();

  await db.insert(auditLogs).values({
    storeId: session.user.storeId,
    userId: session.user.id,
    action: active ? "admin_reactivate_user" : "admin_deactivate_user",
    entityType: "user",
    entityId: id,
    before: { active: target.active },
    after: { active: updated.active },
  });

  revalidatePath("/admin/usuarios");

  return { id: updated.id, active: updated.active };
}
