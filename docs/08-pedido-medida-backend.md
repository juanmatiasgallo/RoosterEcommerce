# Prompt: Paso 4, sub-paso 1 — backend de pedido a medida

Pegar en Claude Code. Guardalo en `docs/dev-log/08-pedido-medida-backend.md`
si querés mantener el orden.

---

Catálogo (Paso 2) cerrado y confirmado en producción. Ahora arrancamos
Paso 4 de `docs/spec-ecommerce-base.md`: pedido a medida. Mercado Pago queda
deliberadamente afuera por ahora (decisión del owner, no técnica) — todo lo
que en el spec dependa de crear la preferencia de pago o cobrar, dejalo como
función stub con un comentario `// TODO: conectar Mercado Pago cuando se
retome esa integracion`, igual que se hizo con `addToCart` en su momento.
Sin commitear ni pushear al terminar, como siempre.

## Qué hacer

Seguí la sección "Pedido a medida (cotizacion)" de
`docs/spec-ecommerce-base.md`. El schema de `customOrders` ya existe
completo en `src/lib/db/schema.ts` (status, quotedPrice, quotedNotes,
quotedAt, etc.) — no lo toques, ya está listo para esto.

- `src/lib/custom-orders/schema.ts`: Zod schemas de entrada.
- `src/lib/custom-orders/actions.ts`:
  - `createCustomOrder`: el cliente sube archivo (.stl/.obj) + specs
    (material, color, quantity, approxSize, notes). Requiere sesión (mismo
    criterio que `src/lib/cart/actions.ts`, `requireUser()`-style). Validar
    en el server, no solo confiar en el `accept` del input: extensión real
    del archivo (`.stl`/`.obj`) y tamaño contra `UPLOADS_MAX_SIZE_MB`.
    Guardar el archivo en `UPLOADS_DIR` con nombre generado server-side
    (mismo criterio que `uploadProductImage` en `catalog/actions.ts` — no
    usar el nombre original del cliente). Status inicial `"pendiente"`.
  - `quoteCustomOrder`: rol admin/empleado (mismo patrón `requireStaff()` de
    `catalog/actions.ts`), setea `quotedPrice`, `quotedNotes`, `quotedAt`,
    pasa `status` a `"cotizado"`. `audit_logs` en esta mutación (a
    diferencia del carrito, esto sí es una mutación sensible según
    `CLAUDE.md` — "cotizaciones" está listado explícitamente).
  - Función stub `initiateCustomOrderPayment` (o el nombre que te parezca
    más claro): recibe el `customOrderId`, valida que pertenezca al usuario
    y que esté en estado `"cotizado"`, y por ahora solo lanza/devuelve un
    error claro tipo "Pago no disponible todavia" en vez de llamar a
    Mercado Pago. Así el frontend de los próximos sub-pasos ya tiene contra
    qué conectar el botón "Pagar", sin bloquear en que Mercado Pago no está
    listo.

No toques `/pedido-a-medida`, `/mi-cuenta`, ni `/admin/pedidos-custom`
todavía — son los próximos sub-pasos.

## Antes de dar por terminado

- `npx tsc --noEmit`, `npm run build`, `npm run test` — los tres pasan.
- No commitear.

## Reportar de vuelta

Funciones exportadas y qué hace cada una, cómo resolviste la validación de
archivo (extensión real vs `accept` del input, tamaño), y confirmación de
los 3 checks.
