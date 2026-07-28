# Prompt: implementar formulario real de login

Pegar en Claude Code, en la raíz de RoosterEcommerce.

---

Sin commitear ni pushear al terminar, como siempre. `/admin/categorias`
quedó implementado pero no se puede probar porque `/login` sigue siendo el
placeholder original del scaffold (`<h1>Iniciar sesion</h1>`, sin form).
Esto no estaba en el alcance de `spec-catalogo.md`, pero es un prerequisito
real para probar cualquier ruta autenticada — implementalo ahora.

## Qué hacer

`src/app/login/page.tsx` (o un componente cliente separado si preferís
mantenerlo Server Component + `*-client.tsx`, seguí la convención que ya
usás en el resto del proyecto):

- Formulario con React Hook Form + Zod, usando el `loginSchema` que ya
  existe en `src/lib/auth/schema.ts` (no lo reescribas)
- Campos: email, password
- Al submit, llamar `signIn("credentials", { email, password, redirect: false })`
  (o el equivalente que corresponda a next-auth v5 beta, la versión que ya
  está instalada — fijate cómo está armado `src/auth.ts` para no romper
  nada de lo existente)
- Leer `callbackUrl` de los searchParams (ya lo arma `src/proxy.ts` al
  redirigir acá) y navegar ahí en caso de éxito
- Mostrar un error legible si `signIn` falla (credenciales inválidas) — sin
  filtrar si el email existe o no, mensaje genérico tipo "Email o
  contraseña incorrectos"
- Estado de carga en el botón mientras se procesa

No toques `/admin/categorias`, `actions.ts` de catálogo, ni nada de lo que
ya está hecho.

## Antes de dar por terminado

- `npx tsc --noEmit`, `npm run build`, `npm run test` — los tres pasan.
- Contame si con esto alcanza para loguearse localmente con el
  `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` que ya tiene el `.env` local, o
  si falta algo más de configuración de next-auth para que funcione
  (`AUTH_SECRET` local, cookies en `http://localhost`, etc.)
- No commitear.

## Reportar de vuelta

Qué archivo(s) se crearon/modificaron, y confirmación de los 3 checks.
