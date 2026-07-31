# Tienda 3D — ecommerce para impresiones 3D

Scaffold inicial. Ver `CLAUDE.md` para las reglas del repo y
`docs/spec-ecommerce-base.md` para el plan de implementacion.

## Stack

- Next.js 16 (App Router) + TypeScript, fullstack en un solo repo
- PostgreSQL + Drizzle ORM
- Auth.js (NextAuth v5) — roles `admin`, `empleado`, `cliente`
- Tailwind + shadcn/ui sobre Base UI
- Mercado Pago (Checkout Pro) para cobros
- 100% self-hosted / open source, sin costos de licencia

## Arrancar en local

```bash
npm install
cp .env.example .env   # completar DATABASE_URL, AUTH_SECRET, MP_ACCESS_TOKEN, etc.
docker compose up -d db
npm run db:generate    # genera la primera migracion desde src/lib/db/schema.ts
npm run db:migrate
npm run db:seed        # carga un producto de ejemplo
npm run dev
```

Generar `AUTH_SECRET` con:

```bash
openssl rand -base64 33
```

## Deploy (VPS + EasyPanel)

Mismo patron que ChickenHouseContab: build por `Dockerfile`
(`output: "standalone"`), migraciones automaticas al arrancar
(`src/instrumentation.ts`), variables de entorno cargadas directo en
EasyPanel (no como archivo `.env`). Detalle completo en `CLAUDE.md`.

## Backup y restore

Ver `docs/backup-restore.md` — que respaldar (base + uploads + variables de
entorno), como restaurarlo, y checklist para migrar a otro VPS/entorno sin
perder nada.

## Estructura

```
src/
  app/
    (site)/          rutas publicas: catalogo, ficha de producto, carrito
    (admin)/admin/   panel de administracion
    api/             route handlers (NextAuth, webhook de Mercado Pago)
  lib/
    db/              schema de Drizzle, cliente, migraciones
    auth/            schema de login, roles
    mercadopago/      cliente de preferencias y pagos
    products/         (a implementar)
    custom-orders/    (a implementar)
    orders/           (a implementar)
docs/                 specs para desarrollo guiado (spec-driven)
```
