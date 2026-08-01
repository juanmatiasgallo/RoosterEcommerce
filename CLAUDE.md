# Reglas para trabajar en este repo

Ecommerce para una empresa de impresion 3D, con dos formas de venta: catalogo
fijo con variantes (material/color/tamano) y pedidos a medida (el cliente sube
un archivo 3D y recibe una cotizacion antes de pagar). Proyecto independiente
de ChickenHouseContab, pero hereda su stack y sus convenciones porque ya estan
probadas en produccion sobre el mismo VPS.

Metodologia: desarrollo spec-driven, igual que ChickenHouseContab. Claude
(web) escribe specs en `docs/`; Claude Code las implementa contra este
archivo. Pasos chicos, verificables y deployados de a uno.

## Arquitectura (no romper sin discutirlo primero)

- Next.js 16 App Router + TypeScript, fullstack en un solo repo. El backend
  vive dentro de Next (rutas `/api` + Server Actions); NO hay servicio de API
  aparte.
- PostgreSQL + Drizzle ORM (no Prisma, no otro ORM) con migraciones en
  `drizzle/`.
- Auth.js (NextAuth v5) con Credentials provider + bcrypt. Tres roles:
  `admin`, `empleado`, `cliente`. A diferencia de ChickenHouseContab, el sitio
  publico (catalogo, ficha de producto, pedido a medida) es navegable SIN
  sesion; solo `/admin/*` y `/mi-cuenta/*` requieren login (ver
  `src/proxy.ts`). `/pedido-a-medida` es publica pero su wizard pide
  identificarse (login o alta rapida) antes de poder subir el archivo --
  mismo patron que `/checkout`, que tampoco esta gateada pero tampoco deja
  pagar sin cuenta.
- UI: Tailwind + shadcn/ui (componentes copiados en `src/components/ui`, no
  un paquete npm cerrado), compuestos con **Base UI** (`@base-ui/react`), no
  Radix. Formularios con React Hook Form + Zod.
- Pagos: **Mercado Pago Checkout Pro** via SDK oficial `mercadopago`. La
  confirmacion del pago es SIEMPRE por webhook (`/api/webhooks/mercadopago`),
  nunca por el `back_url` de exito del navegador.
- Multi-tenant preparado pero no activado: toda tabla de negocio tiene
  `storeId`, hoy fijo a una unica fila en `stores`. Si este proyecto se
  replica para otro cliente, evaluar ahi si conviene una fila nueva en
  `stores` (multi-tenant real) o forkear el repo — no esta decidido todavia,
  no asumir ninguna de las dos.

## Como iterar

- Pasos chicos y verificables. No mezclar refactors grandes con features
  nuevas en el mismo cambio.
- Antes de dar por terminada una tarea: `npm run test`, `npx tsc --noEmit` y
  `npm run build` deben pasar.
- No agregar dependencias de peso (otro ORM, framework de UI, proveedor de
  auth, otro gateway de pago) ni servicios pagos como requisito, sin
  justificarlo primero. Toda herramienta externa debe ser opcional o
  reemplazable por una self-hosted. Objetivo del proyecto: gastos operativos
  = solo el VPS.

## Deploy e infraestructura (EasyPanel sobre VPS)

Mismo patron que ChickenHouseContab, adaptado:

- Se deploya en **EasyPanel**. Proyecto sugerido `tienda3d`, dos servicios:
  `web` (la app) y `bd` (Postgres). Build por **Dockerfile**, salida
  `output: "standalone"`.
- **Migraciones automaticas al arrancar**: `src/instrumentation.ts` corre el
  migrator de Drizzle sobre `drizzle/` al iniciar el contenedor. El
  Dockerfile copia `drizzle/` a la imagen. NO hay paso manual de migracion en
  el VPS.
- **Cada tabla/columna nueva**: `npm run db:generate` y **commitear el `.sql`**
  generado en `drizzle/`. Si no queda commiteado, en produccion no se crea.
- **Conexion a la base perezosa (lazy)** en `src/lib/db/index.ts`: igual que
  ChickenHouseContab, no volver a validar `DATABASE_URL` al importar.
- **Puerto**: EasyPanel pisa `PORT` a **80**; el dominio apunta al puerto 80.
- **NextAuth detras del reverse proxy**: requiere `AUTH_TRUST_HOST=true` y
  `AUTH_URL` con la URL publica https.
- **Archivos subidos (comprobantes de pago y STL/OBJ de pedidos a medida)**:
  van a MinIO (self-hosted, S3-compatible, bucket privado) via
  `src/lib/storage`, misma VPS que `web`. Key con el id del pedido como
  "carpeta" (`receipts/{orderId}/...`, `custom-orders/{customOrderId}/...`)
  para poder listar archivos por pedido filtrando por prefijo. Las URLs que
  ve el cliente son firmadas (`getSignedFileUrl`, vencen en 1h) porque el
  bucket no es de lectura publica. Archivos subidos antes de esta migracion
  pueden seguir sirviendo desde el volumen local viejo
  (`/app/public/uploads`, `UPLOADS_DIR`) — `resolveFileUrl` distingue los dos
  formatos por prefijo, no hace falta tocarlos a mano. Para migrarlos a
  MinIO: `npm run uploads:migrate-to-minio` (correr una sola vez, adentro del
  contenedor del VPS donde vive el volumen).
- **Mercado Pago**: `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET`
  como variables de entorno en EasyPanel (toggle "Crear archivo .env"
  apagado). Usar credenciales de **test** en cualquier entorno que no sea
  produccion real.
- **Primer admin**: bootstrap opcional por `SEED_ADMIN_EMAIL` /
  `SEED_ADMIN_PASSWORD` (en `instrumentation.ts`). Borrar esas envs despues
  del primer login.
- `npm ci` es estricto: si `package.json` y `package-lock.json` se
  desincronizan, correr `npm install` en local y commitear el lock, **en el
  mismo commit** que el cambio de `package.json`. Antes de pushear, correr
  `npm ci` en local y confirmar que termina sin errores.

## Seguridad y datos

- Toda mutacion sensible (pedidos, pagos, cotizaciones, usuarios) queda
  registrada en `audit_logs`, con `userId`, `storeId`, `action`,
  `entityType`, `before`, `after`. Regla sin excepcion, igual que
  ChickenHouseContab.
- Validar en el servidor siempre (Zod). **Recalcular precios y totales
  siempre en el server** al crear una orden — el precio que manda el cliente
  desde el navegador es solo para preview, nunca se usa para cobrar.
- **Pagos**: el webhook de Mercado Pago debe verificar la firma
  (`x-signature`) antes de confiar en el payload, y ser idempotente (un
  reintento de MP no debe duplicar la orden ni el stock). Ver TODO en
  `src/app/api/webhooks/mercadopago/route.ts`.
- **Stock**: descontar stock de una variante recien cuando el pago se
  confirma por webhook, no al agregar al carrito ni al crear la preferencia
  de pago (evita vender de mas por carritos abandonados).
- Todas las queries de catalogo/pedidos/ordenes filtran por `storeId`. Antes
  de editar/borrar por id, verificar que el registro pertenece a la tienda.
- Proteger por rol en `src/proxy.ts` y dentro de cada Server Action (defensa
  en profundidad).
- No hardcodear secretos (van por env; `.env` nunca commiteado,
  `.env.example` documenta las claves). Nunca loguear el `MP_ACCESS_TOKEN` ni
  datos de pago completos.

## Convenciones de codigo

- **Molde CRUD** (mismo patron que ChickenHouseContab): para cada entidad,
  `schema.ts` (Zod) + `actions.ts` (`"use server"`, guard de rol, filtro por
  `storeId`, `audit_logs`, `revalidatePath`) + `page.tsx` (Server Component
  que trae datos scoped) + `*-client.tsx` (interactividad) + `*-form-dialog.tsx`
  (RHF + Zod). Calcar en vez de duplicar a mano.
- **Montos numeric = string en Drizzle**: escribir con `.toFixed(2)`, leer
  con `Number(...)`. Mostrar con `formatCurrency`.
- **Select de Base UI**: registrar con `Controller`/`setValue`+`watch`, no
  `register` directo.
- **Borrado**: productos/variantes = soft delete (`active = false`). Ordenes
  = nunca se borran, solo cambian de estado.

## Estado actual (punto de partida)

Este repo es un scaffold inicial, no una app terminada. Lo que ya existe:
schema de base completo (`src/lib/db/schema.ts`), auth con 3 roles, proxy de
rutas, cliente de Mercado Pago con `createPreference`/`getPayment`, webhook
stub, y paginas placeholder marcadas con `// TODO`. Ver
`docs/spec-ecommerce-base.md` para el plan de implementacion paso a paso.
