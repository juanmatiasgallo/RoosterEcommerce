# Prompt: Paso 2, sub-paso 4 — panel admin de categorías

Pegar en Claude Code, en la raíz de RoosterEcommerce.

---

Seguimos sin commitear ni pushear nada al terminar — dejá los cambios para
que se prueben en local primero. El frontend público (home + ficha de
producto) del sub-paso anterior sigue sin commitear; no lo toques ni lo
pises, son cambios independientes.

## Ojo con esto (ya nos pasó dos veces)

Cualquier página nueva que consulte la DB necesita
`export const dynamic = "force-dynamic"` — si no, el build de Docker en
EasyPanel falla porque no tiene red hacia la base en build time.

## Qué hacer

Implementar `/admin/categorias`, usando el molde CRUD de `CLAUDE.md`
(`schema.ts` ya existe en `src/lib/catalog/schema.ts`, `actions.ts` ya tiene
`createCategory`, `updateCategory`, `reorderCategories` — no los reescribas,
conectate a esas funciones tal como están):

- `src/app/(admin)/admin/categorias/page.tsx`: Server Component, trae
  `listCategoryTree()` scoped a la tienda, protegido por rol admin/empleado
  (mismo patrón que ya usa `src/proxy.ts` para `/admin/*`, más el chequeo
  de rol dentro de la Server Action igual que en `actions.ts`)
- `src/app/(admin)/admin/categorias/categorias-client.tsx`: árbol editable
  — mostrar padre/hijas anidadas, botón para reordenar (drag simple o
  botones subir/bajar, lo que sea más rápido de implementar bien sin
  agregar una dependencia nueva de drag-and-drop), botón editar por
  categoría, botón "Nueva categoría"
- `src/app/(admin)/admin/categorias/categoria-form-dialog.tsx`: alta/edición
  con React Hook Form + Zod (usar el schema de `src/lib/catalog/schema.ts`).
  Campos: nombre, slug, categoría padre (select — si es Base UI Select,
  registrar con `Controller` o `setValue`+`watch`, nunca `register` directo,
  tal como indica `CLAUDE.md`)

No implementes `/admin/productos` todavía — es el sub-paso siguiente, y
depende de que este quede probado primero (los productos van a necesitar
elegir categoría de una lista que salga de acá).

## Antes de dar por terminado

- `npx tsc --noEmit`, `npm run build`, `npm run test` — los tres pasan.
- No commitear.

## Reportar de vuelta

Qué archivos se crearon, cómo resolviste el reordenamiento (mecanismo
elegido y por qué), y confirmación de los 3 checks. Avisame cuando esté
listo para que lo pruebe yo mismo (ahora tengo acceso de lectura directo al
repo, así que además de que lo pruebes vos en `npm run dev`, reviso el
código del lado mío).
