import * as Sentry from "@sentry/nextjs";

// GlitchTip (self-hosted, task #86): mismo criterio que
// instrumentation-client.ts (SDK de Sentry apuntado a nuestro DSN, sin
// features exclusivas de Sentry Cloud). Se inicializa tanto para runtime
// "nodejs" (Server Components, Server Actions, rutas /api) como "edge"
// (src/proxy.ts corre en Edge). Sin GLITCHTIP_DSN (dev local) no hace nada.
function initSentry() {
  const dsn = process.env.GLITCHTIP_DSN;
  if (dsn) {
    Sentry.init({ dsn, tracesSampleRate: 0.2 });
  }
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    initSentry();

    const { runMigrations } = await import("@/lib/db/migrate");
    const { bootstrapAdmin } = await import("@/lib/db/bootstrap-admin");
    const { bootstrapSiteContent } = await import("@/lib/db/bootstrap-site-content");

    await runMigrations();
    await bootstrapAdmin();
    // Contenido inicial de la home (tiempos de entrega, material, servicios)
    // -- idempotente, no hace nada si ya hay filas cargadas.
    await bootstrapSiteContent();
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    initSentry();
  }
}

// Hook de instrumentacion del App Router: captura automaticamente errores
// que escapan de Server Components/Route Handlers durante un request, sin
// tener que envolver cada uno a mano en try/catch. El webhook de Mercado
// Pago ademas tiene captura explicita propia para los casos que no son una
// excepcion (firma invalida), ver ese route.ts.
export const onRequestError = Sentry.captureRequestError;
