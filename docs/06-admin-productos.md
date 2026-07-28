# Prompt: Paso 2, sub-paso 6 — panel admin de productos

Pegar en Claude Code, en la raíz de RoosterEcommerce. (Guardalo en
`docs/dev-log/06-admin-productos.md` si querés mantener el orden.)

---

`/admin/categorias` quedó confirmado funcionando end-to-end (login, guard de
ruta, alta de categoría). Login también terminado. Seguimos sin commitear
ni pushear al terminar. No toques `/admin/categorias`, `/login`, ni el
catálogo público (`/` y `/producto/[slug]`) en esta pasada.

## Ojo con esto (ya nos pasó dos veces)

Cualquier página nueva que consulte la DB necesita
`export const dynamic = "force-dynamic"`.

## Qué hacer

Implementar `/admin/productos`, molde CRUD de `CLAUDE.md`, conectando a lo
que ya existe en `src/lib/catalog/actions.ts` (`createProduct`,
`updateProduct`, `archiveProduct`, `createVariant`, `updateVariant`,
`archiveVariant`, `uploadProductImage`) y `queries.ts` — no reescribas esas
funciones, si falta algo puntual ahí avisalo en el reporte en vez de
duplicar lógica en el frontend.

- `src/app/(admin)/admin/productos/page.tsx`: listado con búsqueda simple
  por nombre (reusar `listProducts({ search })` si sirve, o una query
  liviana propia si `listProducts` está pensada solo para el catálogo
  público y no calza — usá criterio y explicá cuál elegiste)
- `src/app/(admin)/admin/productos/productos-client.tsx`: tabla/listado,
  buscador, botón "Nuevo producto", acción archivar (soft delete, nunca
  borrado real)
- `src/app/(admin)/admin/productos/producto-form-dialog.tsx`: alta/edición
  en un mismo formulario que incluya:
  - datos del producto (nombre, slug, descripción, categoría — select con
    `Controller`, precio base)
  - variantes como lista dinámica (agregar/quitar filas: material, color,
    tamaño, precio, stock, sku) — cada fila usa `createVariant`/`updateVariant`/`archiveVariant`
  - imágenes: subida via `uploadProductImage`, mostrar miniaturas ya
    subidas, permitir reordenar (mismo criterio que usaste para reordenar
    categorías) y eliminar

Seguí la convención de `CLAUDE.md` para montos: los campos `numeric` de
Drizzle son `string` — escribir con `.toFixed(2)`, mostrar con
`formatCurrency` (ya existe en `src/lib/format.ts`).

## Antes de dar por terminado

- `npx tsc --noEmit`, `npm run build`, `npm run test` — los tres pasan.
- No commitear.

## Reportar de vuelta

Archivos creados/modificados, cómo resolviste el listado admin (reutilizaste
`listProducts` o hiciste una query nueva, y por qué), cómo manejaste el
formulario con variantes dinámicas (librería de RHF field arrays o solución
propia), cualquier decisión no cubierta 100% por el spec, y confirmación de
los 3 checks.
