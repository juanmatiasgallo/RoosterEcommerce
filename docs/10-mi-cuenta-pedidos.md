# Prompt: Paso 4, sub-paso 3 — /mi-cuenta/pedidos

Pegar en Claude Code. Guardalo en `docs/dev-log/10-mi-cuenta-pedidos.md` si
querés mantener el orden.

---

Formulario de `/pedido-a-medida` confirmado, incluido el fix del límite de
1 MB en Server Actions. Sin commitear ni pushear al terminar. No toques
`/admin/pedidos-custom` todavía (es el próximo y último sub-paso de este
paso).

**Importante**: esta ruta se pidió antes y no llegó a implementarse (no
existe ninguna carpeta `mi-cuenta` en `src/app` todavía). Confirmá al final,
con un `ls`/`find` real, que el archivo quedó efectivamente creado antes de
reportar terminado — no reportes esto como hecho sin haberlo verificado vos
mismo en el filesystem.

## Ojo con esto

Esta página va a consultar la DB directo (los pedidos del usuario logueado)
en el Server Component, así que necesita `export const dynamic = "force-dynamic"`.

## Qué hacer

`src/proxy.ts` ya protege `/mi-cuenta/*` (requiere sesión), pero la ruta en
sí no existe todavía — creála:

- `src/app/(mi-cuenta)/mi-cuenta/pedidos/page.tsx` (o
  `src/app/mi-cuenta/pedidos/page.tsx` si no hay route group `(mi-cuenta)`
  todavía — fijate qué convención sigue el resto del proyecto antes de
  decidir, y si no hay ninguna, usá la más simple sin over-engineer)
- Listar los `customOrders` del usuario logueado (scoped a
  `session.user.id`), ordenados por más reciente primero: archivo, fecha,
  material/color/cantidad, estado actual, y si está `"cotizado"`: el
  `quotedPrice` y `quotedNotes`
- Cuando el estado es `"cotizado"`: botón "Pagar" que llama a
  `initiateCustomOrderPayment` (el stub que ya existe) — va a tirar el
  error "Pago no disponible todavia", así que mostralo como toast/mensaje
  claro, no como un error roto de la UI. No implementes el flujo de pago
  real.
- Estados visuales razonables para cada status (`pendiente`, `cotizado`,
  `pagado`, `en_impresion`, `listo`, `entregado`, `rechazado`, `cancelado`)
  — un badge de color o texto por estado alcanza, no hace falta nada
  elaborado

Ahora que existe esta ruta, volvé a `src/app/(site)/pedido-a-medida/pedido-a-medida-form-client.tsx`
y sacá el `// TODO: redirigir a /mi-cuenta/pedidos cuando esa ruta exista`
que dejaste marcado — conectá la redirección real post-envío.

## Antes de dar por terminado

- `npx tsc --noEmit`, `npm run build`, `npm run test` — los tres pasan.
- Confirmá con `ls`/`find` real que `page.tsx` (y cualquier otro archivo)
  quedó creado en el filesystem.
- No commitear.

## Reportar de vuelta

Qué convención de ruta usaste y por qué, cómo se ve el manejo del botón
"Pagar" contra el stub, la salida real del `ls`/`find` que confirma que los
archivos existen, y confirmación de los 3 checks.
