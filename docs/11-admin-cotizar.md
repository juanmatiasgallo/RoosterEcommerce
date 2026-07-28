# Prompt: Paso 4, sub-paso 4 (último) — cotización desde admin

Pegar en Claude Code. Guardalo en `docs/dev-log/11-admin-cotizar.md` si
querés mantener el orden.

---

`/mi-cuenta/pedidos` confirmado y verificado en filesystem. Sin commitear
ni pushear al terminar. Este es el último sub-paso de Paso 4 — con esto
queda cerrado el flujo completo de pedido a medida (menos el pago, que
sigue diferido).

## Ojo con esto

Confirmá con `ls`/`find` real que los archivos quedaron creados antes de
reportar terminado, como en el sub-paso anterior.

## Qué hacer

`src/app/(admin)/admin/pedidos-custom/page.tsx` ya existe y lista los
pedidos con status `"pendiente"` — no lo reescribas desde cero, extendelo:

- Agregar un botón/acción "Cotizar" por cada pedido pendiente, que abre un
  form (dialog o inline, tu criterio) con React Hook Form + Zod para cargar
  `quotedPrice` y `quotedNotes`, y llama a `quoteCustomOrder` (ya existe en
  `src/lib/custom-orders/actions.ts`, no lo reescribas — ya tiene el guard
  de que solo se puede cotizar si el estado es `"pendiente"`)
- Mostrar también, aparte de los pendientes, un listado (aunque sea simple)
  de los ya cotizados — hoy la página solo trae `status === "pendiente"`,
  así que una vez cotizado un pedido desaparece de la vista sin dejar
  rastro visual de que se hizo algo. Alcanza con una segunda sección o tab
  simple, no hace falta nada elaborado.
- Formato de montos: `.toFixed(2)` al escribir, `formatCurrency` de
  `src/lib/format.ts` al mostrar (misma convención de siempre).
- Link o preview al archivo subido (`fileUrl`/`fileName` del pedido) para
  que el admin pueda efectivamente ver qué le están pidiendo cotizar antes
  de poner un precio.

## Antes de dar por terminado

- `npx tsc --noEmit`, `npm run build`, `npm run test` — los tres pasan.
- Confirmá con `ls`/`find` real que los archivos nuevos/modificados existen.
- No commitear.

## Reportar de vuelta

Qué archivos se crearon/modificaron, cómo resolviste ver los ya cotizados
(tab, sección aparte, etc.), la salida real de `ls`/`find`, y confirmación
de los 3 checks. Con esto termina Paso 4 completo (sin pago) — decime si
quedó algo del checklist implícito sin cubrir.
