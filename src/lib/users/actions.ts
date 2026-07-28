"use server";

import bcrypt from "bcryptjs";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { auditLogs, users } from "@/lib/db/schema";
import { getDefaultStoreId } from "@/lib/db/store";
import { adminCreateUserSchema } from "./schema";

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
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.storeId, session.user.storeId))
    .orderBy(desc(users.createdAt));
}

export type AdminUserListItem = Awaited<ReturnType<typeof listUsers>>[number];
