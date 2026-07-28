# Prompt: Paso 4, sub-paso 2 — formulario público de pedido a medida

Pegar en Claude Code. Guardalo en `docs/dev-log/09-pedido-medida-form.md`
si querés mantener el orden.

---

Backend de pedido a medida confirmado (`createCustomOrder`,
`quoteCustomOrder`, `initiateCustomOrderPayment` stub). Sin commitear ni
pushear al terminar. No toques `/mi-cuenta` ni `/admin/pedidos-custom`
todavía.

## Ojo con esto (ya nos pasó varias veces)

Si esta página termina consultando la DB directo (por ejemplo si mostrás
algo del pedido recién creado), necesita `export const dynamic = "force-dynamic"`.

## Qué hacer

Reemplazar el placeholder de `src/app/(site)/pedido-a-medida/page.tsx` (hoy
solo texto) por un formulario real, conectado a `createCustomOrder`:

- React Hook Form + Zod (usar el schema de `src/lib/custom-orders/schema.ts`,
  no lo reescribas)
- Campos: archivo (input `type="file"` con `accept=".stl,.obj"` como ayuda
  visual, sabiendo que la validación real ya la hace el server), material,
  color, cantidad, tamaño aproximado, notas
- Estado de carga mientras se sube (puede tardar si el archivo es grande)
- Al enviar con éxito: confirmación clara de que quedó recibido y que se va
  a cotizar (no hay pago todavía en este paso) — redirigir a `/mi-cuenta/pedidos`
  si ya existe, o si ese sub-paso todavía no está, mostrar un mensaje de
  éxito en la misma página con un resumen de lo enviado
- Mostrar el límite de tamaño real (`UPLOADS_MAX_SIZE_MB`) y los formatos
  aceptados de forma visible, no solo al fallar

Esta ruta requiere sesión (ya está protegida en `src/proxy.ts`), así que el
usuario que llega acá ya está logueado — no dupliques ese chequeo en el
componente, pero sí manejá con gracia el caso de que la Server Action falle
por cualquier otro motivo (mostrar el error real, no algo genérico que
esconda qué pasó).

## Antes de dar por terminado

- `npx tsc --noEmit`, `npm run build`, `npm run test` — los tres pasan.
- No commitear.

## Reportar de vuelta

Qué decidiste para el mensaje/redirección post-envío (dado que
`/mi-cuenta/pedidos` probablemente no existe todavía), cómo manejaste el
estado de carga durante la subida del archivo, y confirmación de los 3
checks.
