import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { getDefaultStoreId } from "@/lib/db/store";

// Lectura publica de la galeria de "Proyectos": sin auth, siempre filtra
// por storeId + active=true, mismo criterio que listProducts.
export async function listPublicProjects() {
  const storeId = await getDefaultStoreId();

  return db
    .select()
    .from(projects)
    .where(and(eq(projects.storeId, storeId), eq(projects.active, true)))
    .orderBy(asc(projects.position), desc(projects.createdAt));
}

export type PublicProject = Awaited<ReturnType<typeof listPublicProjects>>[number];
