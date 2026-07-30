"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

/**
 * Tracking de Umami (task #78). Solo en las paginas publicas/de cliente --
 * se corta explicitamente en /admin para que la actividad del staff no
 * infle las metricas de visitas/conversion de la tienda real. Umami no usa
 * cookies ni recolecta datos personales, asi que no hace falta banner de
 * consentimiento.
 *
 * websiteId/src YA vienen resueltos desde el server (ver
 * getPublicUmamiConfig en src/lib/settings/actions.ts, llamado en
 * src/app/layout.tsx): admin/configuracion primero, env vars
 * NEXT_PUBLIC_UMAMI_* como fallback. Este componente no lee process.env
 * directo a proposito -- asi el Website ID se puede cambiar desde
 * /admin/configuracion sin rebuild, algo que no era posible cuando esto
 * vivia baked-in en el bundle del cliente. Mismo motivo por el que ambos
 * son props opcionales: si ninguna fuente tiene datos, no renderiza nada.
 */
export function UmamiScript({ websiteId, src }: { websiteId: string | null; src: string | null }) {
  const pathname = usePathname();

  if (!websiteId || !src || pathname?.startsWith("/admin")) return null;

  return <Script src={src} data-website-id={websiteId} strategy="afterInteractive" />;
}
