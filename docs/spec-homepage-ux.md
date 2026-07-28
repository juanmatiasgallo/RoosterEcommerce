# Spec: Homepage y sistema visual (sin assets reales todavía)

Complementa `docs/spec-catalogo.md`. Arranca sin logo/fotos reales
(decisión del owner) — objetivo: una base visual prolija, coherente y fácil
de reemplazar cuando haya fotos de producto y logo reales. Referencia de
espíritu (no copiar pixel a pixel): Mercado Libre, PedidosYa Market,
Tienda Inglesa online, Multiahorro/Devoto online — catálogos grandes,
búsqueda protagonista, categorías claras, confianza visual simple.

## Fuera de alcance para este paso

- Reseñas de producto: solo el schema de base (tabla), sin UI ni queries.
  Se implementa completo cuando haya compradores reales.
- Fotos/logo reales: se integran después, sin rehacer estructura.
- Newsletter, blog, multi-idioma: no ahora.

## Sistema visual (base para todo el sitio, no solo home)

- **Paleta**: neutros (blancos/grises/negro) como base, un solo color de
  acento para CTAs y estados activos — elegir un acento que transmita
  "taller/fabricación" sin ser genérico tech-startup (evitar el típico
  azul/violeta SaaS). Definir como variables de Tailwind (`tailwind.config`
  o CSS vars en `globals.css`, lo que ya use el proyecto), no hardcodear
  hex sueltos en componentes.
- **Tipografía**: una sola familia sans-serif del sistema o de Google Fonts
  ya integrable con `next/font` (evitar cargar fuentes de más de 2 pesos).
- **Componentes base**: usar lo que ya existe de shadcn/ui sobre Base UI en
  `src/components/ui` (revisar qué hay ya instalado antes de agregar
  componentes nuevos) — Button, Card, Badge, Input ya deberían estar
  cubiertos por lo usado en el catálogo/admin.
- **Placeholder de imagen**: un componente reutilizable
  (`src/components/product-placeholder.tsx` o similar) que muestre un
  bloque neutro con ícono simple (no una foto de stock genérica de
  internet) cuando no hay imagen real — ya existe algo parecido en
  `product-card.tsx` del catálogo ("Sin imagen"), unificar ese criterio en
  un solo componente reutilizable en vez de tenerlo repetido.

## Estructura del home (`src/app/(site)/page.tsx` actual, home del catálogo)

Hoy el home ES el catálogo con filtros (correcto, no separar en dos
páginas). Se agrega ARRIBA del catálogo, antes de la grilla de productos:

1. **Hero simple**: título + bajada corta (qué es la tienda, catálogo +
   pedido a medida), un CTA primario a "Ver catálogo" (scroll a la grilla o
   directo si ya está en la misma página) y uno secundario a
   `/pedido-a-medida`. Sin imagen de fondo real todavía — usar un fondo con
   la paleta definida arriba, no una foto de stock.
2. **"Cómo funciona" en 3 pasos**, enfocado en pedido a medida (es el
   diferencial del negocio): "Subí tu archivo" → "Te cotizamos" → "Lo
   imprimimos y te lo enviamos". Iconos simples (lucide-react, ya es
   dependencia instalada), no ilustraciones custom.
3. **Categorías destacadas**: usar `listCategoryTree()` que ya existe,
   mostrar las categorías raíz como tarjetas grandes clickeables que
   filtran el catálogo (no una ruta nueva).
4. Después de estas 3 secciones, sigue el catálogo con filtros tal como
   está hoy (buscador, sidebar, grilla) — no tocar esa lógica, ya funciona.

## Footer (nuevo, hoy no existe ninguno)

`src/components/site-footer.tsx`, en `src/app/layout.tsx`: links a
categorías principales, `/pedido-a-medida`, `/login`; información de
contacto con placeholders claros marcados para completar (`// TODO:
reemplazar con datos reales de contacto`); sin redes sociales reales
todavía (dejar la estructura pero sin links rotos — o mostrar solo si hay
datos).

## Schema de reseñas (solo base, sin UI)

Nueva tabla en `src/lib/db/schema.ts`, siguiendo las convenciones ya
usadas (uuid pk, storeId, timestamps):

- `productReviews`: `productId` (FK products), `userId` (FK users),
  `rating` (integer, 1-5), `comment` (text, nullable), `verifiedPurchase`
  (boolean — se podría cruzar contra `order_items` para setearlo, pero eso
  es lógica futura, hoy solo la columna), `createdAt`.

Generar y commitear la migración (`npm run db:generate` +
`npm run db:migrate` en local para confirmar que aplica limpio), pero **no
crear ningún query, action, ni componente de UI para reviews en este
paso**.

## Checklist de aceptación

- [ ] `npm run build` y `npx tsc --noEmit` pasan
- [ ] Home muestra hero + cómo funciona + categorías destacadas + catálogo
      existente, sin romper ningún filtro/búsqueda que ya funcionaba
- [ ] Colores/tipografía salen de variables centralizadas, no valores
      sueltos repetidos en componentes
- [ ] Footer visible en todas las páginas del sitio público
- [ ] Migración de `productReviews` aplica limpio en local, sin UI asociada
