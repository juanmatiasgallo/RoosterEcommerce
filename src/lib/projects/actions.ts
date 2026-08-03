"use server";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { auth } from "@/auth";
import type { Role } from "@/lib/auth/schema";
import { db } from "@/lib/db";
import { auditLogs, projects } from "@/lib/db/schema";
import {
  createProjectSchema,
  reorderProjectsSchema,
  updateProjectSchema,
  UPLOAD_PROJECT_IMAGE_ALLOWED_EXTENSIONS,
} from "./schema";

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

async function getOwnedProject(id: string, storeId: string) {
  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.storeId, storeId)))
    .limit(1);
  return row;
}

async function saveProjectImage(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!UPLOAD_PROJECT_IMAGE_ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`Extension no permitida. Usa: ${UPLOAD_PROJECT_IMAGE_ALLOWED_EXTENSIONS.join(", ")}.`);
  }

  const maxSizeMb = Number(process.env.UPLOADS_MAX_SIZE_MB ?? 20);
  if (file.size > maxSizeMb * 1024 * 1024) {
    throw new Error(`El archivo supera el tamano maximo permitido (${maxSizeMb} MB).`);
  }

  const uploadsDir = process.env.UPLOADS_DIR ?? "./public/uploads";
  const projectsDir = path.resolve(uploadsDir, "projects");
  await mkdir(projectsDir, { recursive: true });

  // Mismo criterio que uploadProductImage: nombre generado server-side, no
  // el original del cliente, para evitar path traversal y colisiones.
  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(projectsDir, filename), buffer);

  return `/uploads/projects/${filename}`;
}

async function deleteProjectImageFile(imageUrl: string) {
  const uploadsDir = process.env.UPLOADS_DIR ?? "./public/uploads";
  const filename = imageUrl.split("/").pop();
  if (!filename) return;
  try {
    await unlink(path.resolve(uploadsDir, "projects", filename));
  } catch {
    // Best-effort, igual que deleteProductImage: si ya no esta en disco no
    // bloqueamos la operacion por eso.
  }
}

// Crea el registro y sube la foto en un solo paso (a diferencia del molde
// de productos, que separa alta de producto y carga de imagenes en dos
// acciones) -- aca imageUrl es NOT NULL, un proyecto sin foto no tiene
// sentido en una galeria.
export async function createProject(input: z.infer<typeof createProjectSchema>, file: File) {
  const session = await requireStaff();
  const data = createProjectSchema.parse(input);

  const imageUrl = await saveProjectImage(file);

  const existing = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.storeId, session.user.storeId));

  const [created] = await db
    .insert(projects)
    .values({
      storeId: session.user.storeId,
      title: data.title,
      description: data.description ? data.description : null,
      imageUrl,
      position: existing.length,
      theme: data.theme ? data.theme : null,
      featured: data.featured ?? false,
    })
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "create",
    entityType: "project",
    entityId: created.id,
    after: created,
  });

  revalidatePath("/proyectos");
  revalidatePath("/admin/proyectos");
  return created;
}

export async function updateProject(id: string, input: z.infer<typeof updateProjectSchema>) {
  const session = await requireStaff();
  const data = updateProjectSchema.parse(input);
  const target = await getOwnedProject(id, session.user.storeId);
  if (!target) throw new Error("Proyecto no encontrado.");

  const [updated] = await db
    .update(projects)
    .set({
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description ? data.description : null } : {}),
      ...(data.theme !== undefined ? { theme: data.theme ? data.theme : null } : {}),
      ...(data.featured !== undefined ? { featured: data.featured } : {}),
    })
    .where(eq(projects.id, id))
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "update",
    entityType: "project",
    entityId: id,
    before: target,
    after: updated,
  });

  revalidatePath("/proyectos");
  revalidatePath("/admin/proyectos");
  return updated;
}

export async function replaceProjectImage(id: string, file: File) {
  const session = await requireStaff();
  const target = await getOwnedProject(id, session.user.storeId);
  if (!target) throw new Error("Proyecto no encontrado.");

  const imageUrl = await saveProjectImage(file);
  const [updated] = await db.update(projects).set({ imageUrl }).where(eq(projects.id, id)).returning();

  await deleteProjectImageFile(target.imageUrl);

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "replace_image",
    entityType: "project",
    entityId: id,
    before: { imageUrl: target.imageUrl },
    after: { imageUrl: updated.imageUrl },
  });

  revalidatePath("/proyectos");
  revalidatePath("/admin/proyectos");
  return updated;
}

// Soft delete (mismo criterio que productos/variantes en CLAUDE.md): el
// archivo de imagen se mantiene en disco a proposito (no se borra al
// desactivar, solo al eliminar definitivamente no existe -- si el owner
// reactiva el proyecto, la foto sigue disponible).
export async function setProjectActive(id: string, active: boolean) {
  const session = await requireStaff();
  const target = await getOwnedProject(id, session.user.storeId);
  if (!target) throw new Error("Proyecto no encontrado.");

  const [updated] = await db.update(projects).set({ active }).where(eq(projects.id, id)).returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: active ? "reactivate" : "deactivate",
    entityType: "project",
    entityId: id,
    before: { active: target.active },
    after: { active: updated.active },
  });

  revalidatePath("/proyectos");
  revalidatePath("/admin/proyectos");
  return updated;
}

export async function reorderProjects(items: z.infer<typeof reorderProjectsSchema>) {
  const session = await requireStaff();
  const data = reorderProjectsSchema.parse(items);

  const ids = data.map((item) => item.id);
  const owned = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.storeId, session.user.storeId)));
  const ownedIds = new Set(owned.map((row) => row.id));
  if (!ids.every((id) => ownedIds.has(id))) {
    throw new Error("Algun proyecto no pertenece a la tienda.");
  }

  for (const item of data) {
    await db.update(projects).set({ position: item.position }).where(eq(projects.id, item.id));
  }

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "reorder",
    entityType: "project",
    after: data,
  });

  revalidatePath("/proyectos");
  revalidatePath("/admin/proyectos");
  return data;
}

export async function listProjectsAdmin() {
  const session = await requireStaff();

  return db
    .select()
    .from(projects)
    .where(eq(projects.storeId, session.user.storeId))
    .orderBy(asc(projects.position), desc(projects.createdAt));
}

export type AdminProjectListItem = Awaited<ReturnType<typeof listProjectsAdmin>>[number];
