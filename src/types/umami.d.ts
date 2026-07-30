export {};

// Tipo del objeto global que inyecta script.js de Umami (ver
// src/components/umami-script.tsx). Opcional (window.umami?.) porque en
// paginas donde UmamiScript no renderiza (ej. /admin, o si faltan las env
// vars NEXT_PUBLIC_UMAMI_*) el objeto directamente no existe.
declare global {
  interface Window {
    umami?: {
      track: (
        eventOrProps?:
          | string
          | Record<string, unknown>
          | ((props: Record<string, unknown>) => Record<string, unknown>),
        data?: Record<string, unknown>,
      ) => void;
    };
  }
}
