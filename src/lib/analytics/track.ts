"use client";

// Wrapper fino sobre window.umami.track (task #80): evita repetir en cada
// call site el chequeo de SSR (typeof window === "undefined") y el caso de
// que el script todavia no haya terminado de cargar (strategy=
// "afterInteractive" en umami-script.tsx) o directamente no exista (ej. en
// local sin NEXT_PUBLIC_UMAMI_* seteadas, o dentro de /admin, donde
// UmamiScript no renderiza a proposito). No-op silencioso en esos casos --
// nunca debe romper una interaccion real del usuario por un evento de
// analytics que no se pudo mandar.
export function trackEvent(name: string, data?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.umami?.track(name, data);
}

const TRACKED_PURCHASE_PREFIX = "umami_tracked_order_";

// La pagina de comprobante (/mi-cuenta/compras/[id]) se puede volver a
// visitar muchas veces despues de la compra (el cliente vuelve a mirar su
// pedido, descarga el PDF, etc.) -- sin este dedup por orderId en
// localStorage, "compra_confirmada" se contaria de nuevo en cada visita e
// infla el Revenue de Umami con la misma orden repetida.
export function trackPurchaseOnce(orderId: string, data: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const key = `${TRACKED_PURCHASE_PREFIX}${orderId}`;
  try {
    if (window.localStorage.getItem(key)) return;
    trackEvent("compra_confirmada", data);
    window.localStorage.setItem(key, "1");
  } catch {
    // localStorage puede fallar (modo privado, cuota llena) -- mejor un
    // evento de mas que romper la carga de la pagina por esto.
    trackEvent("compra_confirmada", data);
  }
}
