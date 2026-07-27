# Spec: Catálogo completo (Paso 2)

Amplía el Paso 2 de `docs/spec-ecommerce-base.md` con el detalle de UX
acordado (Mercado Libre, Apple, Decathlon, Linear, Amazon como referencia).

## Decisión de alcance: categorías como tabla, no texto libre

El schema actual tiene `products.category` como varchar. Para el árbol
padre/hijo hace falta una tabla real:

`products.category` (varchar) se reemplaza por `products.categoryId` (uuid,
FK a categories). Esto pide una migración nueva:

1. Actualizar `scripts/seed.ts` para crear categorías (ej. "Figuras y
   decoración" con hijo "Fantasía") antes de los productos.
2. Correr de nuevo `npm run db:generate` — drizzle-kit va a preguntar si es
   rename o drop+add; como cambia de tipo (texto a uuid), es drop+add.
3. `npm run db:migrate` y `npm run db:seed` — la data de prueba actual se
   recrea, no hay nada real que perder todavía.

## Backend

**Queries de catálogo público** (`src/lib/catalog/queries.ts`):

- `listProducts({ search?, categoryId?, material?, color?, minPrice?, maxPrice?, sort? })`
  - `search`: `ILIKE` sobre `name` (alcanza para el volumen inicial; si el
    catálogo crece a cientos de productos, migrar a `pg_trgm` o full-text
    search de Postgres — no hace falta ahora)
  - `categoryId`: incluye la categoría y sus hijas
  - `material` / `color`: filtran por existencia de al menos una variante
    activa que matchee (join a `product_variants`)
  - rango de precio: sobre `products.basePrice`, no sobre cada variante,
    para no complicar la query en v1
  - `sort`: `relevancia` (default, más nuevos primero), `precio_asc`,
    `precio_desc`, `nombre`
  - sin paginación todavía — se agrega cursor-based si el catálogo crece
- `getProductBySlug(slug)`: producto + variantes activas + imágenes
  ordenadas por `position`
- `listCategoryTree()`: categorías con sus hijas, para el árbol de filtros
  y el breadcrumb

**Server Actions de admin** (`src/lib/catalog/actions.ts`), rol
admin/empleado + `audit_logs` en cada mutación:

- `createProduct`, `updateProduct`, `archiveProduct` (soft delete)
- `createVariant`, `updateVariant`, `archiveVariant`
- `createCategory`, `updateCategory`, `reorderCategories`
- `uploadProductImage`: guarda en `UPLOADS_DIR`, valida tipo
  (jpg/png/webp) y tamaño; se sirve con `next/image` para optimizar sin
  pagar un CDN de imágenes

**Carrito** (`src/lib/orders/cart-actions.ts`):

- `addToCart(variantId, quantity)`: valida stock disponible antes de
  agregar
- `updateCartItem`, `removeFromCart`

## Frontend público

**Home / listado** (`src/app/(site)/page.tsx`):

- Buscador arriba, con debounce de ~300ms antes de disparar la query
- Filtros a la izquierda: árbol de categorías, checkboxes de
  material/color, rango de precio — estilo Mercado Libre
- Grilla de tarjetas: imagen, nombre, "desde $X", badge de cantidad de
  variantes disponibles
- Filtrado con `useTransition` de React para que no bloquee la interfaz
  mientras corre la query (inspirado en Linear), transiciones ~150-200ms

**Ficha de producto** (`src/app/(site)/producto/[slug]/page.tsx`):

- Galería de imágenes grande, mucho blanco, un foco por vez (Apple)
- Selector de variante real (material → color → tamaño) que actualiza
  precio y stock disponible en vivo, sin recargar
- Botón "Agregar al carrito" con estado de carga (disabled + spinner
  mientras corre la Server Action)
- "También te puede interesar": 4 productos de la misma categoría
  (cross-sell simple, sin motor de recomendación)

**Categorías**: breadcrumb (`Inicio > Figuras y decoración > Fantasía`) en
la ficha y en el listado filtrado.

## Panel admin

- `/admin/productos`: listado con búsqueda simple, alta/edición con
  variantes e imágenes en el mismo formulario (molde CRUD del CLAUDE.md)
- `/admin/categorias`: árbol editable, alta/edición, reordenar

## Fuera de alcance para este paso

- Reseñas/calificaciones de producto
- Favoritos/wishlist (es del dominio Customers, no Catalog — se aborda en
  `/mi-cuenta` más adelante)
- Autocompletado con tolerancia a errores de tipeo — mejora de v2, no
  bloquea la venta

## Checklist de aceptación

- [ ] `npm run build` y `npx tsc --noEmit` pasan
- [ ] Buscar por nombre + filtrar por categoría/material/color/precio,
      combinados, devuelve resultados correctos
- [ ] Cambiar de variante en la ficha actualiza precio y stock sin
      recargar la página
- [ ] Agregar al carrito respeta el stock disponible de la variante
- [ ] Un producto sin stock en ninguna variante se muestra pero no
      permite agregarlo al carrito