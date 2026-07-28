# Prompt: chequeo de estado — Paso 2 (Catálogo)

Pegar esto en Claude Code (VS Code), en la raíz de RoosterEcommerce.

---

Necesito un reporte de estado real del repo contra `docs/spec-ecommerce-base.md`
y `docs/spec-catalogo.md`, para pasárselo a Claude (web) que está coordinando
el trabajo y no tiene visibilidad directa del código actual. No implementes
nada nuevo en esta pasada — solo auditá y reportá.

## 1. Checks automáticos

Corré estos tres comandos y reportá si cada uno pasa o falla (pegar el error
si falla, no solo "falla"):

- `npx tsc --noEmit`
- `npm run build`
- `npm run test`

## 2. Checklist de aceptación de `docs/spec-catalogo.md`

Para cada punto, decime si está implementado, parcialmente implementado, o
no implementado. Si es parcial, especificá qué falta:

- [ ] Buscar por nombre + filtrar por categoría/material/color/precio,
      combinados, devuelve resultados correctos
- [ ] Cambiar de variante en la ficha actualiza precio y stock sin recargar
      la página
- [ ] Agregar al carrito respeta el stock disponible de la variante
- [ ] Un producto sin stock en ninguna variante se muestra pero no permite
      agregarlo al carrito

## 3. Inventario de lo implementado

Contra el plan de `docs/spec-ecommerce-base.md` (Pasos 2 a 6) y el detalle
de `docs/spec-catalogo.md`, listá qué existe hoy en el repo, archivo por
archivo, agrupado así:

- **Backend de catálogo**: ¿existen `src/lib/catalog/queries.ts` y
  `src/lib/catalog/actions.ts`? ¿Qué funciones tiene cada uno?
- **Migración de categorías**: ¿`products.category` ya es `categoryId`
  (uuid, FK)? ¿Existe la tabla `categories`? ¿La migración está en
  `drizzle/` y commiteada?
- **Frontend público**: estado real de `/` (home con filtros/búsqueda) y
  `/producto/[slug]` (selector de variante en vivo) — ¿terminado, a medias,
  o siguen como estaban (placeholder)?
- **Carrito**: ¿existe `src/lib/cart/actions.ts` o similar con `addToCart`,
  `updateQuantity`, `removeFromCart`? ¿`/carrito` ya lista items reales?
- **Panel admin**: ¿existen `/admin/productos` y `/admin/categorias`? ¿Qué
  tan completos están (solo listado, o también alta/edición)?
- **Pedido a medida, checkout, webhook de Mercado Pago, panel de órdenes**
  (Pasos 3 a 6 del spec base): ¿se tocó algo de esto, o siguen intactos
  como placeholder?

## 4. Deuda o decisiones pendientes

Cualquier cosa que hayas implementado con un criterio propio (no
especificado en los docs) y que Claude (web) debería conocer para no
contradecirla, o cualquier bloqueo/duda que tengas para seguir.

## 5. Estado de git

Pegá la salida de:

```
git log --oneline -10
git status
```

---

Formateá la respuesta completa en Markdown, con estos mismos 5 títulos, para
que se pueda pegar tal cual de vuelta en la conversación con Claude (web).
