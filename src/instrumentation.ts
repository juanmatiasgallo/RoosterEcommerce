export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runMigrations } = await import("@/lib/db/migrate");
    const { bootstrapAdmin } = await import("@/lib/db/bootstrap-admin");
    const { bootstrapSiteContent } = await import("@/lib/db/bootstrap-site-content");

    await runMigrations();
    await bootstrapAdmin();
    // Contenido inicial de la home (tiempos de entrega, material, servicios)
    // -- idempotente, no hace nada si ya hay filas cargadas.
    await bootstrapSiteContent();
  }
}
