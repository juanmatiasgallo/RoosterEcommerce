export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runMigrations } = await import("@/lib/db/migrate");
    const { bootstrapAdmin } = await import("@/lib/db/bootstrap-admin");

    await runMigrations();
    await bootstrapAdmin();
  }
}
