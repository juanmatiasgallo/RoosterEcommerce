# Prompt: Paso 6 (parcial) — dashboard admin con datos reales

Pegar en Claude Code. Guardalo en `docs/dev-log/12-admin-dashboard.md` si
querés mantener el orden.

---

Homepage/UX confirmado. Sin commitear ni pushear al terminar. Confirmá con
`ls`/`find` real que los archivos quedaron creados antes de reportar
terminado, como en los últimos sub-pasos.

## Contexto importante

Mercado Pago sigue diferido — todavía no hay ningún flujo que cree
`orders` reales (el "Ir a pagar" del carrito no está conectado). Por eso
este dashboard **no** muestra "órdenes pagadas recientes" todavía (no
existe ese dato real); si mostrás algo ahí, que sea un estado vacío
explícito ("Sin órdenes pagadas todavía — se habilita con el checkout"), no
un dato inventado ni un placeholder que parezca real.

## Ojo con esto

`/admin/dashboard` va a consultar la DB, necesita `export const dynamic = "force-dynamic"`.

## Qué hacer

Reemplazar `src/app/(admin)/admin/dashboard/page.tsx` (hoy texto estático)
con datos reales, reusando funciones que ya existen donde se pueda en vez
de escribir queries nuevas duplicadas:

- **Pedidos a medida pendientes de cotizar**: contá cuántos hay con
  `status === "pendiente"` (podés reusar `listCustomOrdersForAdmin()` de
  `src/lib/custom-orders/actions.ts` y filtrar, o agregar un `count()`
  liviano si te parece más prolijo — tu criterio) — mostrar el número y un
  link directo a `/admin/pedidos-custom`
- **Productos con stock bajo**: definí un umbral razonable (por ejemplo
  stock <= 3, dejalo como constante nombrada, no un número mágico suelto)
  sobre `product_variants` activas de productos activos — mostrar cuántas
  variantes están en ese rango, con nombre de producto + variante, link a
  `/admin/productos`
- **Resumen general**: cantidad de productos activos, cantidad de
  categorías, cantidad de pedidos a medida cotizados esperando pago (otro
  número, no confundir con "pagados")
- Usar los componentes `Card`/`Badge` de `src/components/ui/` que ya
  existen del sub-paso anterior, no inline styles sueltos

No toques `/admin/pedidos` (ese todavía no existe y depende de que haya
`orders` reales — no lo crees en este sub-paso, no hay nada real que
mostrar ahí todavía).

## Antes de dar por terminado

- `npx tsc --noEmit`, `npm run build`, `npm run test` — los tres pasan.
- Confirmá con `ls`/`find` real que los archivos existen.
- No commitear.

## Reportar de vuelta

Qué queries/funciones usaste (reusadas vs nuevas), el umbral de stock bajo
que elegiste y por qué, la salida real de `ls`/`find`, y confirmación de
los 3 checks.
