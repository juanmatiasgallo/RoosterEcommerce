# Prompt: configuración SMTP desde el admin

Pegar en Claude Code. Guardalo en `docs/dev-log/15-smtp-config.md` si
querés mantener el orden.

---

SEO confirmado. Sin commitear ni pushear al terminar. Confirmá con
`ls`/`find` real los archivos antes de reportar terminado.

## Contexto

El owner quiere configurar el SMTP para notificaciones desde la propia UI
de admin, no por variables de entorno fijas — así puede cambiar el
proveedor sin tocar el VPS. La contraseña SMTP es un secreto real y tiene
que guardarse encriptada en la base, nunca en texto plano (mismo espíritu
que `CLAUDE.md` pide para `MP_ACCESS_TOKEN` y datos de pago).

## Qué hacer

**1. Encriptación** (`src/lib/crypto.ts`, nuevo): funciones `encrypt(text)`
/ `decrypt(text)` con AES-256-GCM usando el módulo `crypto` nativo de Node
(sin dependencia nueva). La clave sale de una env var nueva
`SETTINGS_ENCRYPTION_KEY` (32 bytes) — si no está seteada, estas funciones
deben fallar con un error claro al usarse, no fallar en silencio ni usar
una clave por defecto insegura. Agregala a `.env.example` con un comentario
de cómo generarla (`openssl rand -hex 32` o el equivalente con `node -e`
que ya venimos usando en esta sesión).

**2. Schema** (`src/lib/db/schema.ts`): agregar a la tabla `stores` (no
crear tabla nueva, es 1:1 con la tienda): `smtpHost`, `smtpPort` (integer),
`smtpUser`, `smtpPasswordEncrypted` (text, el resultado de `encrypt()`),
`smtpFromEmail`, `smtpFromName`, `smtpSecure` (boolean, default false) —
todos nullable, la tienda puede no tener SMTP configurado todavía. Generar
y aplicar la migración en local.

**3. Dependencia nueva**: agregar `nodemailer` (+ `@types/nodemailer` en
dev). Es la única dependencia nueva de este sub-paso, justificada porque es
exactamente la librería estándar de Node para hablar SMTP con cualquier
proveedor (incluido uno self-hosted), no un servicio pago ni un SDK
propietario.

**4. `src/lib/settings/actions.ts`** (nuevo dominio):

- `getSmtpSettings()`: solo rol **admin** (no `empleado` — es config
  sensible de toda la tienda, restringilo más que el molde CRUD habitual;
  dejalo documentado en un comentario por qué difiere del patrón usual).
  Devuelve los campos SMTP **sin** desencriptar el password (mandar algo
  tipo `smtpPasswordSet: boolean` al frontend, nunca el valor real ni
  encriptado)
- `updateSmtpSettings(input)`: mismo guard admin-only, encripta el password
  antes de guardar si vino uno nuevo en el input (si el campo vino vacío en
  el form, no lo sobreescribas — mantené el que ya había), `audit_logs` en
  esta mutación (es config sensible, aplica el mismo criterio que
  "usuarios" de `CLAUDE.md`)
- `sendTestEmail()`: admin-only, arma un transporter de `nodemailer` con la
  config actual (desencriptando el password solo en memoria, nunca
  logueado — repasá que ningún `console.log` ni error propague el password
  en texto plano), manda un mail simple al `smtpFromEmail` configurado.
  Devolver éxito/error claro (si falla la conexión SMTP, mostrar el motivo
  real, no un genérico)

**5. `/admin/configuracion`** (nueva ruta, admin-only — reforzar el guard
también a nivel de página, no confiar solo en la Server Action): form con
RHF + Zod para host/puerto/usuario/password/remitente/nombre/TLS, botón
"Guardar", y botón separado "Enviar email de prueba" (deshabilitado si no
hay config guardada todavía). Usar los componentes de `src/components/ui/`
ya existentes.

## Antes de dar por terminado

- `npx tsc --noEmit`, `npm run build`, `npm run test` — los tres pasan.
- No podés probar el envío real (no tenés credenciales SMTP reales en este
  entorno) — decilo explícito en vez de simular una prueba. Sí podés
  verificar que `encrypt(decrypt(x)) === x` con un valor de prueba, y que
  la Server Action rechaza el acceso a un usuario no-admin.
- Confirmá con `ls`/`find` real los archivos.
- No commitear.

## Reportar de vuelta

Confirmación de que `encrypt`/`decrypt` funcionan simétricamente, cómo
verificaste el guard admin-only, qué le llega exactamente al frontend
sobre el password (confirmar que nunca es el valor real), y confirmación
de los 3 checks.
