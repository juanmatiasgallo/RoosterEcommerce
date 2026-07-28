# Prompt: registro de cuenta (crear cuenta)

Pegar en Claude Code. Guardalo en `docs/dev-log/17-registro.md` si querés
mantener el orden.

---

Prerequisito del header nuevo que viene después. Sin commitear ni pushear
al terminar. Confirmá con `ls`/`find` real los archivos antes de reportar
terminado.

## Contexto

Hoy no existe ningún flujo público de registro — solo login, y el único
usuario real es el admin sembrado por `SEED_ADMIN_EMAIL`. Hay que construir
esto de cero.

## Qué hacer

**1. `src/lib/auth/schema.ts`**: agregar `registerSchema` (nombre, email,
password, confirmPassword — con `.refine()` de que password y
confirmPassword coincidan). No toques `loginSchema` existente.

**2. `src/lib/auth/actions.ts`** (nuevo): `registerUser(input)`:
- Valida con `registerSchema`
- Verifica que el email no esté ya en uso (case-insensitive, mismo criterio
  que ya usa `src/auth.ts` con `email.toLowerCase()`) — si ya existe, error
  claro sin filtrar si es por email duplicado de forma que ayude a
  enumeración de cuentas (mensaje tipo "Ese email ya está registrado",
  está bien ser directo acá, no es login)
- Hashea el password con `bcryptjs` (ya es dependencia), mismo costo que
  usa `src/lib/db/bootstrap-admin.ts`
- Crea el usuario con `role: "cliente"` siempre (nunca aceptar un rol desde
  el input — hardcodealo), `storeId` de `getDefaultStoreId()`
  (`src/lib/db/store.ts`, ya existe)
- `audit_logs`: `action: "register"`, `entityType: "user"`, `entityId` y
  `userId` son el usuario recién creado (es su propia acción)

**3. `src/app/(site)/crear-cuenta/page.tsx` + `crear-cuenta-form-client.tsx`**,
mismo patrón que `login`:
- RHF + Zod con `registerSchema`
- Al enviar con éxito: llamar `registerUser`, y si sale bien, encadenar un
  `signIn("credentials", {...})` con el mismo email/password (mismo
  mecanismo que ya usa `login-form-client.tsx`) para loguear automático
  sin pedirle que lo haga de nuevo a mano
- Después del login automático, llamar `mergeGuestCartIntoUser()` (ya
  existe en `src/lib/cart/actions.ts`) — alguien puede estar registrándose
  con un carrito de invitado armado
- Redirigir a `/` al terminar
- Link cruzado: agregar "¿Ya tenés cuenta? Iniciá sesión" en
  `crear-cuenta`, y "¿No tenés cuenta? Creá una" en `login-form-client.tsx`
  (hoy no tiene ningún link hacia el registro, porque no existía)

## Antes de dar por terminado

- `npx tsc --noEmit`, `npm run build`, `npm run test` — los tres pasan.
- Probá contra tu DB real: registrar un usuario de prueba, confirmar que
  queda con rol `cliente`, password hasheado (nunca en texto plano en la
  columna), y que un segundo intento con el mismo email lo rechaza. Borrá
  el usuario de prueba al final.
- Confirmá con `ls`/`find` real los archivos.
- No commitear.

## Reportar de vuelta

Cómo verificaste el hash del password (no en texto plano) y el rechazo de
email duplicado, y confirmación de los 3 checks.
