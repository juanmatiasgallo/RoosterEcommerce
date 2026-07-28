# Prompt: Paso 2, sub-paso 7 — carrito

Pegar en Claude Code. Guardalo en `docs/dev-log/07-carrito.md` si querés
mantener el orden.

---

`/admin/productos` y `/admin/categorias` quedan pendientes de que el usuario
los pruebe en local — no los toques en esta pasada. Sin commitear ni
pushear al terminar, como siempre.

## Qué hacer

Seguí la sección "Carrito" de `docs/spec-catalogo.md`:

- `src/lib/cart/actions.ts` (o `src/lib/orders/cart-actions.ts`, fijate cuál
  ruta menciona `docs/spec-ecommerce-base.md` y usá esa para no generar dos
  ubicaciones distintas para lo mismo — si hay ambigüedad real entre los dos
  docs, decidí una y explicá por qué en el reporte):
  - `addToCart(variantId, quantity)`: valida que la variante esté activa y
    que `quantity` no supere el `stock` disponible, todo scoped a
    `session.user.id` (requiere login — revisá cómo protege
    `src/proxy.ts` las rutas que si lo requieren, y replicá el criterio acá
    a nivel Server Action)
  - `updateCartItem(cartItemId, quantity)`: misma validación de stock
  - `removeFromCart(cartItemId)`

- `src/app/(site)/carrito/page.tsx`: reemplazar el placeholder — listar los
  `cartItems` del usuario logueado con producto/variante/cantidad/subtotal,
  recalcular el total en el server (no confiar en nada que venga ya
  calculado del cliente), botones para cambiar cantidad y quitar item

- Conectar el stub de `variant-selector-client.tsx` (el que dice
  `// TODO: conectar a addToCart cuando exista src/lib/orders/cart-actions.ts`)
  al `addToCart` real. Reemplazá el `setTimeout` + toast falso por la
  llamada real, manteniendo el mismo feedback visual (loading + toast de
  éxito/error) que ya tenía el stub.

- El checklist de `spec-catalogo.md` pide explícitamente: "Un producto sin
  stock en ninguna variante se muestra pero no permite agregarlo al
  carrito" — confirmá que el selector de variante ya deshabilita/oculta esa
  opción cuando corresponde (se implementó en el sub-paso del frontend, pero
  no estaba conectado a un `addToCart` real todavía para probarlo de punta a
  punta).

`/carrito` va a necesitar `force-dynamic` igual que las páginas anteriores,
por lo mismo de siempre.

## Antes de dar por terminado

- `npx tsc --noEmit`, `npm run build`, `npm run test` — los tres pasan.
- No commitear.

## Reportar de vuelta

Qué ubicación elegiste para las cart actions y por qué, cómo quedó la
validación de stock (dónde exactamente se recalcula), y confirmación de los
3 checks. Con esto se cierra el checklist completo de `spec-catalogo.md` —
decime también, repasando los 5 puntos del checklist, cuáles quedan
cumplidos de punta a punta y cuáles necesitan que yo los pruebe primero.
