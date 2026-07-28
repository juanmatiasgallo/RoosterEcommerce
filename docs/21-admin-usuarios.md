# Prompt: gestión de usuarios desde el admin (crear empleado/admin)

Pegar en Claude Code. Guardalo en `docs/dev-log/21-admin-usuarios.md` si
querés mantener el orden. Depende del prompt 20 (shell del admin) — corré
ese primero si todavía no lo hiciste.

---

Sin commitear ni pushear al terminar. Confirmá con `ls`/`find` real los
archivos antes de reportar terminado.

## Contexto

El admin necesita poder crear cuentas de `empleado` y de otro `admin`
desde la UI, sin tocar la base a mano. Es **admin-only** (mismo criterio
que Configuración/SMTP en `src/lib/settings/actions.ts` — más sensible que
el molde CRUD habitual de admin+empleado).

## Qué hacer

**1. `src/lib/users/schema.ts`** (nuevo): `adminCreateUserSchema` (nombre,
email, password, confirmPassword con `.refine()`, `role: z.enum(["admin",
"empleado"])` — nunca `"cliente"` acá, ese flujo ya existe en
`/crear-cuenta` y es autoservicio).

**2. `src/lib/users/actions.ts`** (nuevo):
- `requireAdmin()` guard (mismo patrón que `src/lib/settings/actions.ts` —
  dejá un comentario explicando por qué es admin-only y no el molde staff
  habitual, igual que se documentó ahí).
- `adminCreateUser(input)`: valida con el schema, verifica que el email no
  esté en uso (mismo criterio case-insensitive que ya usa `src/auth.ts` y
  `registerUser`), hashea el password con `bcryptjs` al mismo costo que
  `src/lib/db/bootstrap-admin.ts`, crea el usuario con `storeId` de
  `getDefaultStoreId()`, y el `role` tomado del input (a diferencia de
  `registerUser`, acá SÍ se acepta el rol porque lo elige un admin, no el
  propio usuario que se registra) — rechazar explícitamente si de alguna
  forma llega `"cliente"` en el input.
- `audit_logs`: `action: "admin_create_user"`, `entityType: "user"`,
  `userId` = el admin que la creó, `entityId` = el usuario nuevo.
- `listUsers()`: admin-only, trae todos los usuarios de la tienda
  (`storeId` scoped) con id/nombre/email/rol/fecha de creación — nunca el
  hash del password. Orden por fecha de creación descendente.

**3. `src/app/(admin)/admin/usuarios/page.tsx` + `usuarios-client.tsx` +
`usuario-form-dialog.tsx`**: mismo molde CRUD que
`productos`/`categorias` (`page.tsx` Server Component trae `listUsers()`,
`*-client.tsx` maneja la tabla + el dialog de alta, RHF + Zod con
`adminCreateUserSchema`). Tabla: nombre, email, rol, fecha. Botón "Nuevo
usuario" abre el dialog.

**4. Guard también a nivel de página** (no confiar solo en la Server
Action ni en que el sidebar la esconde — defensa en profundidad).

## Antes de dar por terminado

- `npx tsc --noEmit`, `npm run build`, `npm run test` — los tres pasan.
- Probá contra tu DB real: crear un usuario `empleado` de prueba, confirmar
  rol correcto, password hasheado, y `audit_logs` con la entrada esperada.
  Confirmá también que un usuario `empleado` (no admin) no puede acceder ni
  a la página ni a la Server Action. Borrá el usuario de prueba al final.
- Confirmá con `ls`/`find` real los archivos.
- No commitear.

## Reportar de vuelta

Cómo verificaste el guard admin-only (página + action), confirmación del
hash de password y del `audit_log`, y confirmación de los 3 checks.
