import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { users, stores } from "./schema";

/**
 * Crea la tienda por defecto y el primer admin si no existe, usando
 * SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD. Borrar esas envs despues del
 * primer login (mismo patron que ChickenHouseContab).
 */
export async function bootstrapAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) return;

  let [store] = await db.select().from(stores).limit(1);
  if (!store) {
    [store] = await db
      .insert(stores)
      .values({ name: "Tienda 3D", slug: "tienda-3d" })
      .returning();
  }

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  if (existing) return;

  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(users).values({
    storeId: store.id,
    name: "Admin",
    email: email.toLowerCase(),
    passwordHash,
    role: "admin",
  });

  console.log(`Admin bootstrap creado: ${email}`);
}
