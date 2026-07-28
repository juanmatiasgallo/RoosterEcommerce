import type { MetadataRoute } from "next";
import { listProducts } from "@/lib/catalog/queries";

// Consulta la DB (listProducts): sin esto, el build de Docker en EasyPanel
// intenta generarlo en build time y falla (no tiene red hacia la base ahi).
export const dynamic = "force-dynamic";

const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";

// No incluye /admin/*, /mi-cuenta/*, ni /carrito: no tiene sentido
// indexarlas (varias ni deberian ser rastreables, ver src/app/robots.ts).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await listProducts();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/pedido-a-medida`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/login`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${baseUrl}/producto/${product.slug}`,
    lastModified: product.createdAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...productRoutes];
}
