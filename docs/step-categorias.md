# Prompt: Paso 2, sub-paso 1 — migración de categorías

Pegar en Claude Code, en la raíz de RoosterEcommerce.

---

Confirmado por el reporte de estado anterior: nada del Paso 2 (catálogo) está
implementado todavía a nivel código, solo se agregó el doc `spec-catalogo.md`.
Arrancamos ahora, de a un sub-paso chico y verificable por vez, como pide
`CLAUDE.md`. Esta pasada es **solo** la migración de categorías — no toques
`queries.ts`, `actions.ts`, ni ningún `page.tsx` todavía. Si terminás esto y
te sobra tiempo, no sigas con lo siguiente sin que te lo pida explícitamente.

## Qué hacer

Seguí la sección "Decisión de alcance: categorías como tabla, no texto libre"
de `docs/spec-catalogo.md`:

1. En `src/lib/db/schema.ts`, agregar una tabla `categories` con soporte de
   árbol padre/hijo (`parentId` uuid, nullable, self-reference a
   `categories.id`), más los campos que ya uses de convención en el resto
   del schema (`id` uuid pk, `name`, `slug` único, `storeId`, `createdAt`).
2. Reemplazar `products.category` (varchar) por `products.categoryId` (uuid,
   FK a `categories.id`).
3. Actualizar `scripts/seed.ts`: crear categorías de ejemplo antes que los
   productos (ej. "Figuras y decoración" con hija "Fantasía", como sugiere
   el spec), y usar `categoryId` en vez de `category` al crear el producto
   sembrado.
4. Correr `npm run db:generate`. Como cambia de tipo (varchar a uuid), va a
   preguntar rename vs drop+add — confirmar **drop+add** (así lo indica el
   spec, no hay datos reales que perder todavía).
5. Correr `npm run db:migrate` y `npm run db:seed` en local, y verificar a
   mano (con `db:studio` o una query) que la categoría y el producto
   sembrado quedaron bien relacionados.

## Fix chico aparte (no relacionado, pero rápido de hacer ahora)

`npm run test` falla siempre porque no hay ningún archivo de test todavía —
no es un bug, pero rompe el gate de "antes de terminar una tarea" de
`CLAUDE.md`. Agregá `passWithNoTests: true` dentro de `test: {}` en
`vitest.config.ts`, así el comando pasa hasta que se escriba el primer test
real (no reemplaza escribir tests, solo destraba el check mientras tanto).

## Antes de dar por terminado

- `npx tsc --noEmit` pasa.
- `npm run build` pasa.
- `npm run test` pasa (con el fix de arriba).
- `git status`: confirmá que `drizzle/` tiene el archivo `.sql` nuevo y que
  no queda nada de esto sin trackear.
- Commit con mensaje específico y verídico (no genérico) — algo como
  `feat(catalogo): tabla categories + products.categoryId, seed actualizado`.
  Si el mensaje dice que hiciste más de lo que realmente hiciste, decilo
  explícito en el cuerpo del commit, no lo escondas.
- Push a `main`.

## Reportar de vuelta

Contame en texto plano (no hace falta otro .md): qué migración se generó
(nombre del archivo en `drizzle/`), si `db:generate` te preguntó rename o
drop+add y qué elegiste, y confirmación de los 3 checks (tsc/build/test).
