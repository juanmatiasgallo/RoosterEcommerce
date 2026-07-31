import * as Sentry from "@sentry/nextjs";

// GlitchTip (self-hosted, task #86): habla el mismo protocolo que Sentry, asi
// que se integra con el SDK oficial @sentry/nextjs apuntado a nuestro DSN en
// vez de a Sentry Cloud. Sin DSN (dev local sin la env var) no se inicializa
// -- no rompe nada, solo no reporta.
//
// tracesSampleRate bajo (0.2, no 1.0): performance monitoring es un extra,
// no el objetivo principal ahi -- el objetivo es errores. GlitchTip ademas
// no soporta todas las features de Sentry Cloud (session replay, profiling),
// asi que no se configuran aca.
const dsn = process.env.NEXT_PUBLIC_GLITCHTIP_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.2,
  });
}

// Hook de instrumentacion del App Router (SDK >=9.12): captura breadcrumbs
// de navegacion client-side para que los errores muestren en que pagina/
// transicion ocurrieron. No-op si Sentry no se inicializo (sin DSN).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
