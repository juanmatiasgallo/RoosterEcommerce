# Prompt: carrito de invitado (sin login)

Pegar en Claude Code. Guardalo en `docs/dev-log/13-carrito-invitado.md` si
querés mantener el orden.

---

Decisión de producto ya tomada por el owner: hoy `cartItems.userId` es
obligatorio, lo que fuerza login antes de agregar cualquier cosa al
carrito. Esto reduce conversión — se cambia a que un visitante anónimo
pueda armar carrito, y recién se le pida login en el checkout (que hoy ni
siquiera existe, así que por ahora "recién se le pide login" significa
"nunca, hasta que se implemente Mercado Pago" — pero la arquitectura tiene
que quedar lista para eso).

Sin commitear ni pushear al terminar. Confirmá con `ls`/`find` real que los
archivos quedaron creados/modificados antes de reportar terminado.

## Qué hacer

**1. Schema** (`src/lib/db/schema.ts`): `cartItems.userId` pasa a nullable,
agregar `guestId` (uuid, nullable) — un carrito pertenece a `userId` O a
`guestId`, nunca ninguno o los dos. Generar y aplicar la migración en local
(`db:generate` + `db:migrate`), confirmando que aplica limpio contra la
data existente (hoy ya hay filas reales con `userId` seteado — no deberían
romperse).

**2. Identificación de invitado**: al agregar al carrito sin sesión, generar
un `guestId` (`randomUUID()`) y guardarlo en una cookie httpOnly
(`cart_guest_id`, con expiración razonable tipo 30 días) usando `cookies()`
de `next/headers`. Si la cookie ya existe, reusarla.

**3. `src/lib/cart/actions.ts`**: reescribir `addToCart`, `updateCartItem`,
`removeFromCart`, `getCartItems` para funcionar tanto con `session.user.id`
como con el `guestId` de la cookie — la lógica de validación de stock no
cambia, solo de dónde sale el identificador del dueño del carrito. Si hay
sesión, usar `userId` siempre (ignorar cualquier cookie de invitado que
pueda quedar de antes).

**4. Fusión al loguearse**: cuando un usuario con carrito de invitado
(cookie `cart_guest_id` presente) inicia sesión, sus `cartItems` con ese
`guestId` deben pasar a pertenecer a su `userId` — si ya tenía algo en el
carrito de esa cuenta para la misma variante, sumar cantidades respetando
el stock (mismo criterio que ya usa `addToCart` para no duplicar filas).
Después de fusionar, borrar la cookie de invitado. Enganchar esto en el
lugar que corresponda del flujo de login (revisá `src/auth.ts` y
`login-form-client.tsx` para decidir el punto exacto — puede ser un
callback de NextAuth o una Server Action explícita llamada después de
`signIn` exitoso, tu criterio, pero tiene que pasar siempre que alguien se
loguee con un carrito de invitado real).

**5. `src/proxy.ts`**: sacar `/carrito` de las rutas que requieren sesión
(ya no debería estar ahí — un invitado tiene que poder ver su carrito).

## Antes de dar por terminado

- `npx tsc --noEmit`, `npm run build`, `npm run test` — los tres pasan.
- Probá vos mismo (script contra la DB real, como en pasos anteriores) el
  flujo completo: agregar al carrito sin sesión → cookie se crea → loguearse
  → los items pasan al usuario → cookie desaparece. Y el caso de fusión con
  cantidades que ya existían de antes en el carrito de la cuenta.
- Confirmá con `ls`/`find` real los archivos tocados.
- No commitear.

## Reportar de vuelta

Cómo resolviste el punto de enganche del login (callback de NextAuth vs
Server Action separada, y por qué), cómo migró la data existente sin
romperse, resultado del smoke test de fusión con cantidades previas, y
confirmación de los 3 checks.
