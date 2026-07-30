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
 * Website ID y URL del script vienen por env var (NEXT_PUBLIC_*, no
 * hardcodeados): si no estan seteadas (ej. en local sin instancia de Umami
 * a mano), el componente no renderiza nada en vez de romper.
 */
export function UmamiScript() {
  const pathname = usePathname();
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const src = process.env.NEXT_PUBLIC_UMAMI_SRC;

  if (!websiteId || !src || pathname?.startsWith("/admin")) return null;

  return <Script src={src} data-website-id={websiteId} strategy="afterInteractive" />;
}
