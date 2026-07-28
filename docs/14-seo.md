# Prompt: SEO básico — metadata dinámica + sitemap

Pegar en Claude Code. Guardalo en `docs/dev-log/14-seo.md` si querés
mantener el orden.

---

Carrito de invitado confirmado. Sin commitear ni pushear al terminar.
Confirmá con `ls`/`find` real los archivos antes de reportar terminado.

## Qué hacer

**1. Metadata dinámica por página**, usando `generateMetadata` de Next.js
(App Router), no el objeto estático `metadata` que ya existe en el layout
raíz (ese queda como fallback general):

- `src/app/(site)/producto/[slug]/page.tsx`: título tipo
  `"{nombre del producto} | Tienda 3D"`, descripción a partir de
  `product.description` (recortada a un largo razonable si es muy larga, o
  un fallback genérico si no tiene descripción cargada), `openGraph` con
  la primera imagen del producto si tiene (usar el mismo criterio de
  `getProductBySlug` que ya trae las imágenes ordenadas) o sin imagen si no
  hay ninguna todavía.
- `src/app/(site)/page.tsx`: si hay un filtro de categoría activo en la URL
  (`categoryId`), título/descripción que lo reflejen (`"{categoría} | Tienda
  3D"`); si no hay filtro, el genérico del layout alcanza.

**2. `src/app/sitemap.ts`** (convención nativa de Next.js App Router, no
un archivo estático a mano): generar URLs de todas las páginas públicas
reales — home, `/pedido-a-medida`, `/login`, y una entrada por cada
producto activo (`getProductBySlug`/`listProducts` ya te dan lo necesario,
no dupliques la query). No incluir `/admin/*`, `/mi-cuenta/*`, ni `/carrito`
(no tiene sentido indexarlas, y varias ni deberían ser rastreables).

**3. Revisá `public/robots.txt`**: hoy permite todo (`Allow: /`) — agregar
`Disallow` explícito para `/admin/`, `/mi-cuenta/`, `/carrito`, `/api/`, y
una línea `Sitemap:` apuntando a `/sitemap.xml` (usar `AUTH_URL` o una env
var de dominio público si ya existe alguna, no hardcodear el dominio si se
puede evitar — si no hay ninguna disponible, dejalo hardcodeado pero
marcalo en el reporte).

## Antes de dar por terminado

- `npx tsc --noEmit`, `npm run build`, `npm run test` — los tres pasan.
- Contra tu `npm run dev`, confirmá con una request real (`curl` o similar)
  que `/sitemap.xml` devuelve XML válido con URLs reales, y que el `<title>`
  de una ficha de producto real cambia según el producto.
- Confirmá con `ls`/`find` real los archivos.
- No commitear.

## Reportar de vuelta

Qué decidiste para el dominio del sitemap/robots (env var vs hardcodeado),
salida real de la verificación del sitemap, y confirmación de los 3
checks.
