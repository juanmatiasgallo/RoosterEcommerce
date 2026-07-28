# Prompt: Paso 2, sub-paso 3 — home con filtros + ficha de producto

Pegar en Claude Code, en la raíz de RoosterEcommerce.

---

**Cambio de modalidad a partir de ahora**: no hagas commit ni push al
terminar. Dejá los archivos modificados sin commitear — los voy a probar en
local (`npm run dev`) y decido yo cuándo commitear y pushear. Si en algún
momento anterior a esto ya habías commiteado por costumbre, avisalo, pero
de acá en adelante el ciclo termina en "quedó listo para probar", no en
"pusheado".

Backend de catálogo confirmado y pusheado (`861a2c9`): `src/lib/catalog/queries.ts`
y `actions.ts` ya existen y pasaron sus checks. Ahora conectamos el frontend
público a ese backend.

## Ojo con esto antes de arrancar

Ya nos pasó una vez: cualquier página que haga queries a la DB (directo o
vía `listProducts`/`getProductBySlug`) necesita `export const dynamic = "force-dynamic"`
(o el patrón equivalente que prefieras si encontrás uno mejor — pero no lo
dejes por defecto en estático) porque el build de Docker en EasyPanel no
tiene red hacia la DB. Si una página nueva se pre-renderiza como estática en
build time, el deploy va a fallar igual que la vez pasada.

## Qué hacer

Seguí la sección "Frontend público" de `docs/spec-catalogo.md`:

**Home (`src/app/(site)/page.tsx`)**:
- Buscador arriba, con debounce ~300ms antes de disparar la query (usando
  `listProducts({ search })`)
- Filtros a la izquierda: árbol de categorías (`listCategoryTree()`),
  checkboxes de material/color, rango de precio
- Grilla de tarjetas: imagen, nombre, "desde $X", badge de cantidad de
  variantes disponibles
- Filtrado con `useTransition` de React para que no bloquee la UI mientras
  corre la query

**Ficha de producto (`src/app/(site)/producto/[slug]/page.tsx`)**:
- Galería de imágenes (usar lo que ya devuelve `getProductBySlug`)
- Selector de variante real (material → color → tamaño) que actualiza
  precio y stock disponible en vivo, sin recargar la página
- Botón "Agregar al carrito" con estado de carga — **el `addToCart` real
  todavía no existe** (es el próximo sub-paso), así que dejalo llamando a
  una función stub que solo loguea o muestra un toast, y marcalo con
  `// TODO: conectar a addToCart cuando exista src/lib/orders/cart-actions.ts`.
  No inventes una Server Action de carrito ahora.
- "También te puede interesar": 4 productos de la misma categoría

**Breadcrumb**: `Inicio > Categoría > Subcategoría`, en la ficha y en el
listado filtrado.

No toques `/admin/*` en esta pasada — eso es el sub-paso siguiente.

## Antes de dar por terminado

- `npx tsc --noEmit`, `npm run build` (con atención especial a que `/` y
  `/producto/[slug]` no se generen como estáticas), `npm run test` — los
  tres pasan.
- No commitear. Dejar todo modificado/sin trackear tal cual queda.

## Reportar de vuelta

Qué archivos se crearon/modificaron, cómo resolviste el debounce y el
`useTransition` (Client Component separado vs todo en uno), cualquier
decisión de UI no especificada en el spec, y confirmación de los 3 checks.
Avisame cuando esté listo para que yo lo pruebe en `npm run dev`.
