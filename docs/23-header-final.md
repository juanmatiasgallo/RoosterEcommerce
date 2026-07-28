# Prompt: header definitivo (Categorías/Ofertas/Ayuda) + footer con Quiénes somos

Pegar en Claude Code. Guardalo en `docs/dev-log/23-header-final.md` si
querés mantener el orden. Independiente de los prompts 20/21/22 — se puede
correr en cualquier momento.

---

Sin commitear ni pushear al terminar. Confirmá con `ls`/`find` real los
archivos antes de reportar terminado.

## Contexto

El owner ya vio el primer header (todavía sin deployar) y pidió
simplificarlo: no quiere todas las categorías sueltas en la barra. La nav
principal tiene que ser: **Categorías, Ofertas, Ayuda**. "Ofertas" queda
como placeholder por ahora (no existe todavía el concepto de descuento en
el catálogo — se construye como su propio paso más adelante, no lo mezcles
acá). "Quiénes somos" no va en el header — va en el footer, junto a otros
links/datos.

## Qué hacer

**1. `src/components/site-header.tsx`**: reemplazar el listado de
categorías sueltas por un único item "Categorías" que despliega un
dropdown con el árbol que ya se le pasa (`categoryTree`) — sin librería
nueva, un `<details>/<summary>` o un `useState` simple alcanza, mismo
criterio de "sin animaciones complejas" del paso anterior.

Agregar "Ofertas" como placeholder: **sin link real**, mostralo con
estilo deshabilitado (opacity reducida, `cursor-not-allowed`, sin `href`)
— no lo linkees a ningún lado ni inventes una página vacía para esto.

Agregar "Ayuda" linkeando a `/ayuda` (punto 2 de abajo).

Mantené "Pedido a medida" como item aparte (es un flujo de conversión
central del negocio, no es catálogo) — no lo escondas dentro de otro menú.

**2. `src/app/(site)/ayuda/page.tsx`** (nuevo): página corta de FAQ +
WhatsApp — el owner pidió las dos cosas juntas, no una u otra. Preguntas
frecuentes sugeridas (ajustá si el repo ya documenta algo distinto):
tiempos de impresión, métodos de pago (Mercado Pago), envíos, materiales
disponibles, cómo funciona un pedido a medida. Sumá también un botón/link
de WhatsApp bien visible en la misma página — revisá qué placeholder de
contacto ya usa `site-footer.tsx` y reusá el mismo criterio (no inventes un
número real que no existe en ningún lado del código; si hace falta,
dejalo como el mismo placeholder ya existente, comentado como `// TODO`
para reemplazar por el real).

**3. `site-footer.tsx`**: agregar un link a "Quienes somos"
(`/quienes-somos` — la página en sí todavía no existe, es un paso aparte
del backlog; el link puede apuntar ahí igual y va a dar 404 hasta que se
construya esa página — dejalo así, comentado con un `// TODO`, en vez de
omitirlo, para no perderlo cuando se arme la página).

## Antes de dar por terminado

- `npx tsc --noEmit`, `npm run build`, `npm run test` — los tres pasan.
- Confirmá con `ls`/`find` real los archivos.
- No commitear.

## Reportar de vuelta

Cómo armaste el dropdown de categorías sin librerías nuevas, qué contenido
pusiste en `/ayuda` y de dónde lo sacaste, y confirmación de los 3 checks.
