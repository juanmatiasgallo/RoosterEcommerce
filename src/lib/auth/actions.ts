"use server";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { auditLogs, users } from "@/lib/db/schema";
import { getDefaultStoreId } from "@/lib/db/store";
import { sendMail } from "@/lib/mail";
import { changePasswordSchema, forgotPasswordSchema, registerSchema, updateProfileSchema } from "./schema";

const TEMP_PASSWORD_VALID_HOURS = 24;

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

// Datos propios frescos de la DB para /mi-cuenta/perfil -- session.user (JWT)
// no trae phone, y name/email podrian estar desactualizados si el usuario
// los cambio en otra pestana antes de volver a loguearse (ver comentario de
// updateMyProfile mas abajo).
export async function getMyProfile() {
  const session = await auth();
  if (!session) throw new Error("Debes iniciar sesion.");

  const [user] = await db
    .select({ name: users.name, email: users.email, phone: users.phone })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (!user) throw new Error("Usuario no encontrado.");

  return user;
}

// Edicion de datos propios desde /mi-cuenta/perfil (task #116). Devuelve
// emailChanged para que el cliente sepa si tiene que cerrar sesion y volver
// a entrar -- con sesion JWT (ver src/auth.ts), el mail que se ve en el
// header queda "horneado" en el token desde el login y no se refresca solo
// hasta el proximo signIn, asi que forzar un logout es lo mas simple y
// confiable (evita meter trigger:"update" en el callback jwt).
export async function updateMyProfile(input: z.infer<typeof updateProfileSchema>) {
  const session = await auth();
  if (!session) throw new Error("Debes iniciar sesion.");

  const data = updateProfileSchema.parse(input);
  const email = data.email.toLowerCase();

  const [current] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
  if (!current) throw new Error("Usuario no encontrado.");

  const emailChanged = email !== current.email;

  if (emailChanged) {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) throw new Error("Ese email ya esta en uso por otra cuenta.");
  }

  const [updated] = await db
    .update(users)
    .set({ name: data.name, email, phone: data.phone })
    .where(eq(users.id, session.user.id))
    .returning();

  await db.insert(auditLogs).values({
    storeId: session.user.storeId,
    userId: session.user.id,
    action: "update_profile",
    entityType: "user",
    entityId: session.user.id,
    before: { name: current.name, email: current.email, phone: current.phone },
    after: { name: updated.name, email: updated.email, phone: updated.phone },
  });

  return { emailChanged };
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

// Sin 0/O/1/l/I: evita que una contrasena generada al azar sea imposible de
// tipear a mano si hace falta (aunque el flujo esperado es copiar/pegar
// desde el mail).
const TEMP_PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

function generateTempPassword(length = 12): string {
  const bytes = randomBytes(length);
  let password = "";
  for (let i = 0; i < length; i++) {
    password += TEMP_PASSWORD_ALPHABET[bytes[i] % TEMP_PASSWORD_ALPHABET.length];
  }
  return password;
}

// "Olvide mi contrasena": genera una contrasena temporal segura, la guarda
// (hasheada, igual que cualquier otra) con vencimiento, y la manda por
// mail. Siempre devuelve el mismo resultado generico exista o no la cuenta
// — no se filtra si un email esta registrado via este flujo (a diferencia
// de checkEmailExists, que es explicitamente publico para el checkout).
export async function requestPasswordReset(input: z.infer<typeof forgotPasswordSchema>) {
  const data = forgotPasswordSchema.parse(input);
  const email = data.email.toLowerCase();

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (user && user.active) {
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const expiresAt = new Date(Date.now() + TEMP_PASSWORD_VALID_HOURS * 60 * 60 * 1000);

    await db
      .update(users)
      .set({ passwordHash, tempPasswordExpiresAt: expiresAt, mustChangePassword: true })
      .where(eq(users.id, user.id));

    await db.insert(auditLogs).values({
      storeId: user.storeId,
      userId: user.id,
      action: "password_reset_requested",
      entityType: "user",
      entityId: user.id,
    });

    // Resiliente a proposito (no relanza): si el mail falla, no hay forma
    // de que el usuario reciba la temporal de todos modos, asi que no vale
    // la pena romper la respuesta generica de abajo por eso.
    try {
      await sendMail({
        storeId: user.storeId,
        to: user.email,
        subject: "Tu nueva contrasena temporal",
        text: [
          `Generamos una contrasena temporal para tu cuenta: ${tempPassword}`,
          `Es valida por ${TEMP_PASSWORD_VALID_HOURS} horas. Al iniciar sesion con ella te vamos a pedir que la cambies por una definitiva.`,
          "Si vos no pediste esto, podes ignorar este mail — tu contrasena anterior dejo de funcionar, escribinos si necesitas ayuda.",
        ].join("\n\n"),
      });
    } catch {
      // No-op: ver comentario de arriba.
    }
  }

  return { success: true as const };
}

// Cambio de contrasena: obligatorio (recien entro con la temporal, sin
// currentPassword) o voluntario (desde /mi-cuenta, exige currentPassword).
export async function changePassword(input: z.infer<typeof changePasswordSchema>) {
  const session = await auth();
  if (!session) throw new Error("Debes iniciar sesion.");

  const data = changePasswordSchema.parse(input);

  const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
  if (!user) throw new Error("Usuario no encontrado.");

  if (!user.mustChangePassword) {
    if (!data.currentPassword) throw new Error("Ingresa tu contrasena actual.");
    const matches = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!matches) throw new Error("La contrasena actual no es correcta.");
  }

  const passwordHash = await bcrypt.hash(data.newPassword, 10);

  await db
    .update(users)
    .set({ passwordHash, tempPasswordExpiresAt: null, mustChangePassword: false })
    .where(eq(users.id, user.id));

  await db.insert(auditLogs).values({
    storeId: user.storeId,
    userId: user.id,
    action: "password_changed",
    entityType: "user",
    entityId: user.id,
  });

  return { success: true as const };
}
