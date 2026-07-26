# Spec: base del ecommerce

## Contexto

Scaffold inicial creado a partir de las convenciones de ChickenHouseContab.
El schema de base, auth, proxy y cliente de Mercado Pago ya estan escritos.
Falta la implementacion real de cada modulo. Este spec define el orden de
trabajo para Claude Code.

## Paso 1 — Poner el proyecto en pie

1. `npm install`, copiar `.env.example` a `.env` y completar `DATABASE_URL`.
2. `docker compose up -d db` para levantar Postgres local.
3. `npm run db:generate` (deberia generar la migracion inicial a partir de
   `src/lib/db/schema.ts`, que ya esta escrito) y commitear el `.sql`
   resultante en `drizzle/`.
4. `npm run db:migrate` y `npm run db:seed` para tener un producto de prueba.
5. `npm run dev` y verificar que `/` lista el producto sembrado.

## Paso 2 — Catalogo completo

- `src/lib/products/schema.ts` + `actions.ts` (CRUD de productos y
  variantes, solo rol admin/empleado, con `audit_logs`).
- `/admin/productos`: listado + alta/edicion con imagenes (subida a
  `UPLOADS_DIR`, no a la base).
- `/producto/[slug]`: completar el selector de variante (material, color,
  tamano) y el boton "Agregar al carrito" (ver mockup `ficha_producto_3d`
  del chat), que llama a una Server Action `addToCart`.

## Paso 3 — Carrito y checkout de catalogo

- `src/lib/cart/actions.ts`: `addToCart`, `updateQuantity`, `removeFromCart`,
  todas scoped a `session.user.id`.
- `/carrito`: listar items, recalcular total en el server (nunca confiar en
  el total que muestra el cliente).
- Boton "Ir a pagar" → Server Action que: crea una fila en `orders` con
  status `pendiente_pago` + sus `order_items`, llama a `createPreference`, y
  redirige al `init_point` que devuelve Mercado Pago.

## Paso 4 — Pedido a medida (cotizacion)

- `src/lib/custom-orders/schema.ts` + `actions.ts`: `createCustomOrder`
  (cliente sube archivo + specs, status inicial `pendiente`), y
  `quoteCustomOrder` (admin, pone `quotedPrice`, pasa a `cotizado`).
- `/pedido-a-medida`: formulario real (ver mockup
  `formulario_pedido_a_medida`), validar extension (.stl/.obj) y tamano
  (`UPLOADS_MAX_SIZE_MB`) en el server, no solo en el input `accept`.
- `/mi-cuenta/pedidos`: el cliente ve sus cotizaciones y, cuando el estado es
  `cotizado`, un boton "Pagar" que crea la orden (`source: "pedido_custom"`)
  y la preferencia de Mercado Pago igual que el Paso 3.
- `/admin/pedidos-custom`: cola de pendientes por cotizar (ya existe el
  listado base, falta el form de cotizacion).

## Paso 5 — Webhook de Mercado Pago (critico, no saltear seguridad)

- Verificar `x-signature` contra `MP_WEBHOOK_SECRET` antes de procesar nada.
- Idempotencia: si `orders.mpPaymentId` ya esta seteado, no reprocesar.
- Al confirmar `approved`: actualizar `orders.status` a `pagado`, descontar
  stock de las variantes involucradas (solo ahora, no antes), escribir
  `audit_logs`.
- Estados no aprobados (`rejected`, `cancelled`): dejar la orden en su
  estado, no tocar stock.

## Paso 6 — Panel admin minimo

- `/admin/dashboard`: pedidos pendientes de cotizar, ordenes pagadas
  recientes, productos con stock bajo.
- `/admin/pedidos`: cambiar estado de una orden pagada
  (`en_preparacion` → `enviado` → `entregado`).

## Fuera de alcance por ahora (no implementar sin discutirlo)

- Multi-tenant real (mas de una fila en `stores`).
- Otro medio de pago ademas de Mercado Pago.
- Envios internacionales / multi-moneda.
- Facturacion electronica.
