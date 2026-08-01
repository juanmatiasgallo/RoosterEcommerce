"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { seedDemoCatalog, type SeedDemoCatalogSummary } from "./seed-demo";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "admin") throw new Error("No autorizado.");
  return session;
}

// Boton admin en vez de script (mismo criterio que
// migrateUploadsToMinioAction en storage/actions.ts): el build standalone de
// Next/Docker no incluye tsx ni devDependencies, asi que un script suelto no
// corre dentro del contenedor de produccion en EasyPanel -- exponerlo como
// Server Action gatillado desde la UI si corre con el runtime ya compilado.
export async function seedDemoCatalogAction(): Promise<SeedDemoCatalogSummary> {
  await requireAdmin();
  const summary = await seedDemoCatalog();
  revalidatePath("/");
  revalidatePath("/admin/productos");
  return summary;
}
