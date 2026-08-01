"use server";

import { auth } from "@/auth";
import { runUploadsMigration, type MigrationSummary } from "@/lib/storage/migrate";

// Admin-only estricto (mismo criterio que telegram/actions.ts): esto lee y
// escribe archivos de otros usuarios via storage, no es un molde
// admin+empleado comun.
async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    throw new Error("No autorizado.");
  }
  return session;
}

// Boton "Migrar archivos legacy a MinIO" en /admin/configuracion -- ver
// runUploadsMigration para el porque de que esto viva en una Server Action
// en vez de (o ademas de) scripts/migrate-uploads-to-minio.ts.
export async function migrateUploadsToMinioAction(): Promise<MigrationSummary> {
  await requireAdmin();
  return runUploadsMigration();
}
