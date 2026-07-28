# Prompt: logout funcional

Pegar en Claude Code. Guardalo en `docs/dev-log/18-logout.md` si querés
mantener el orden.

---

Registro confirmado. Sin commitear ni pushear al terminar. Confirmá con
`ls`/`find` real los archivos antes de reportar terminado.

## Contexto

`signOut` está disponible desde `next-auth` (exportado en `src/auth.ts`)
pero no se llama desde ningún lado del código — no existe ningún botón de
cerrar sesión hoy. El owner lo marcó como bloqueante antes de producción.

## Qué hacer

**1. `src/components/logout-button.tsx`** (nuevo, Client Component
reutilizable): llama a `signOut()` de `next-auth/react` con
`{ redirectTo: "/" }` (o el mecanismo equivalente de la versión de
next-auth que ya está instalada — confirmá cuál corresponde revisando cómo
está armado `login-form-client.tsx` para no romper el patrón). Tiene que
llevar siempre a `/` (home del sitio público), nunca a `/login` ni a
ninguna ruta de `/admin`, sea cual sea el rol del usuario.

**2. Ubicación temporal**: agregalo a `src/components/site-footer.tsx`,
visible solo si hay sesión activa (mostrar "Cerrar sesión" con el nombre o
email del usuario logueado al lado). Esto es un lugar provisorio — en el
próximo sub-paso (header nuevo) este mismo botón se va a mover ahí, así que
no lo dupliques ni inventes lógica nueva de sesión en el header cuando
llegue ese momento, reusá este componente.

**3. Confirmá el comportamiento real** en los tres roles que existen
(`admin`, `empleado`, `cliente`) — cerrar sesión desde cualquiera de los
tres tiene que terminar en `/`, sin excepción, ni siquiera para el admin
que venía navegando desde `/admin/dashboard`.

## Antes de dar por terminado

- `npx tsc --noEmit`, `npm run build`, `npm run test` — los tres pasan.
- No podés clickear el botón real en un browser (limitación conocida de tu
  entorno) — verificá al menos que la sesión efectivamente se invalida del
  lado del server después de llamar `signOut` (por ejemplo, confirmando que
  una request posterior a una ruta protegida ya no reconoce la sesión, si
  podés simularlo de alguna forma razonable con lo que tenés disponible; si
  no podés, decilo explícito en vez de asumir que funciona).
- Confirmá con `ls`/`find` real los archivos.
- No commitear.

## Reportar de vuelta

Qué mecanismo exacto de next-auth usaste para el redirect, cómo probaste
(o no pudiste probar) la invalidación real de sesión, y confirmación de
los 3 checks.
