import type { NextConfig } from "next";

// Heatmaps de Umami v3 (task #82) cargan la pagina real dentro de un iframe
// para superponer el overlay de clicks/scroll -- los navegadores bloquean
// eso por default, hay que optar explicitamente permitiendo el origen del
// dashboard de Umami via frame-ancestors. Se deriva de la misma env var que
// ya usa el tracker (NEXT_PUBLIC_UMAMI_SRC, ver umami-script.tsx) para no
// mantener una segunda fuente de verdad -- si no esta seteada, no se agrega
// el header (el preview del heatmap no carga, pero nada se rompe).
const umamiOrigin = (() => {
  try {
    return process.env.NEXT_PUBLIC_UMAMI_SRC ? new URL(process.env.NEXT_PUBLIC_UMAMI_SRC).origin : null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: `${Number(process.env.UPLOADS_MAX_SIZE_MB ?? 20) + 2}mb`,
    },
  },
  async headers() {
    if (!umamiOrigin) return [];
    return [
      {
        source: "/:path*",
        headers: [{ key: "Content-Security-Policy", value: `frame-ancestors 'self' ${umamiOrigin};` }],
      },
    ];
  },
};

export default nextConfig;
