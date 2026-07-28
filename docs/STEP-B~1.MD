# Prompt: Paso 2, sub-paso 2 — backend de catálogo

Pegar en Claude Code, en la raíz de RoosterEcommerce.

---

Sub-paso anterior (migración de categorías) confirmado y pusheado
(`8c2435d`). Ahora sigue **solo** la capa de datos del catálogo: queries
públicas + Server Actions de admin. No toques ningún `page.tsx` ni
componente de UI en esta pasada — eso es el próximo sub-paso, separado.

## 1. `src/lib/catalog/schema.ts`

Zod schemas de validación de entrada para lo que van a usar las actions de
abajo: crear/editar producto, crear/editar variante, crear/editar categoría.
Seguí el patrón de validación que ya existe en `src/lib/auth/schema.ts`.

## 2. `src/lib/catalog/queries.ts` (lectura pública, sin auth)

Implementar, tal como las describe `docs/spec-catalogo.md`:

- `listProducts({ search?, categoryId?, material?, color?, minPrice?, maxPrice?, sort? })`
  - `search`: `ILIKE` sobre `products.name`
  - `categoryId`: incluye la categoría pasada y sus hijas directas (join
    contra `categories.parentId`)
  - `material` / `color`: filtran por existencia de al menos una
    `product_variants` activa que matchee (usar `exists` o join +
    `distinct`, lo que sea más simple de leer)
  - rango de precio: sobre `products.basePrice` (no por variante)
  - `sort`: `relevancia` (default: más nuevos primero, por `createdAt`),
    `precio_asc`, `precio_desc`, `nombre`
  - sin paginación todavía (se agrega después si hace falta)
- `getProductBySlug(slug)`: producto + variantes activas + imágenes
  ordenadas por `position`
- `listCategoryTree()`: categorías con sus hijas anidadas (para el árbol de
  filtros y el breadcrumb que se va a usar en el próximo sub-paso)

## 3. `src/lib/catalog/actions.ts` (mutaciones, rol admin/empleado)

Server Actions, siguiendo el molde CRUD de `CLAUDE.md` (guard de rol +
filtro por `storeId` + `audit_logs` en cada mutación + `revalidatePath`):

- `createProduct`, `updateProduct`, `archiveProduct` (soft delete, no
  borrado real)
- `createVariant`, `updateVariant`, `archiveVariant`
- `createCategory`, `updateCategory`, `reorderCategories`
- `uploadProductImage`: guarda el archivo en `UPLOADS_DIR` (no en la base),
  valida tipo (jpg/png/webp) y tamaño en el server, no solo en el input del
  form (que todavía no existe, así que esta validación es la única barrera
  real por ahora)

## Antes de dar por terminado

- `npx tsc --noEmit`, `npm run build`, `npm run test` pasan los tres.
- Ningún `page.tsx` ni componente de UI tocado — si tocaste alguno por
  necesidad real, decilo explícito en el reporte, no lo omitas.
- Commit con mensaje específico (qué funciones se agregaron, no un genérico
  "backend de catálogo"). Push a `main`.

## Reportar de vuelta

Lista de funciones exportadas de `queries.ts` y `actions.ts` (nombre y qué
hace cada una en una línea), cualquier decisión de implementación que
tomaste sin estar 100% especificada en el spec (por ejemplo, cómo resolviste
el filtro de material/color con joins), y confirmación de los 3 checks.
