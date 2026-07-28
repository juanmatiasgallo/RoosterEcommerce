import type { MetadataRoute } from "next";

// Convencion nativa de Next.js (reemplaza el public/robots.txt estatico que
// habia): permite interpolar AUTH_URL en la linea Sitemap, algo que un
// archivo estatico no puede hacer.
const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/mi-cuenta/", "/carrito", "/api/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
