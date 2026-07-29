"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/lib/db";
import { auditLogs, users } from "@/lib/db/schema";
import { getDefaultStoreId } from "@/lib/db/store";
import { registerSchema } from "./schema";

export async function registerUser(input: z.infer<typeof registerSchema>) {
  const data = registerSchema.parse(input);
  const email = data.email.toLowerCase();

  // Directo a proposito ("ese email ya esta registrado"): esto no es login,
  // ahi si importa no filtrar existencia de cuentas — aca el usuario ya
  // esta intentando registrarse con ese email, no hay nada que esconder.
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    throw new Error("Ese email ya esta registrado.");
  }

  const storeId = await getDefaultStoreId();
  // Mismo costo que bootstrap-admin.ts.
  const passwordHash = await bcrypt.hash(data.password, 10);

  const [created] = await db
    .insert(users)
    .values({
      storeId,
      name: data.name,
      email,
      phone: data.phone,
      passwordHash,
      // Nunca se acepta un rol desde el input: quien se registra por este
      // formulario publico siempre es "cliente".
      role: "cliente",
      termsAcceptedAt: new Date(),
    })
    .returning();

  await db.insert(auditLogs).values({
    storeId,
    userId: created.id,
    action: "register",
    entityType: "user",
    entityId: created.id,
    after: { id: created.id, email: created.email, name: created.name, role: created.role },
  });

  return { id: created.id, email: created.email };
}

// Publica: el paso 1 del checkout (identificacion por mail) la usa para
// decidir si pide contrasena (cuenta existente) o datos de registro (cuenta
// nueva). No filtra nada mas sensible que "existe o no" — mismo dato que ya
// se podria inferir intentando registrarse con ese mail.
export async function checkEmailExists(email: string) {
  const normalized = email.trim().toLowerCase();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, normalized)).limit(1);
  return { exists: Boolean(existing) };
}
