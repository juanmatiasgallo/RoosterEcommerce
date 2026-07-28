# Prompt: primera notificación real por mail (pedido cotizado)

Pegar en Claude Code. Guardalo en `docs/dev-log/16-notif-cotizacion.md` si
querés mantener el orden.

---

Config SMTP confirmada (el owner ya cargó credenciales reales y probó el
envío de prueba). Sin commitear ni pushear al terminar. Confirmá con
`ls`/`find` real los archivos antes de reportar terminado.

## Qué hacer

**1. Extraer un helper compartido de mail**, `src/lib/mail.ts` (nuevo):

- `sendMail({ to, subject, text, html? })`: arma el transporter leyendo la
  config SMTP de la tienda (reusá exactamente la misma lógica que ya existe
  en `sendTestEmail` de `src/lib/settings/actions.ts` — extraela a este
  helper en vez de duplicarla, y hacé que `sendTestEmail` llame a esta
  función nueva). Si la tienda no tiene SMTP configurado (cualquiera de los
  campos obligatorios falta), devolvé un resultado de "no configurado" en
  vez de tirar una excepción — quien llame a `sendMail` desde otro flujo
  (como el que sigue) no debería explotar solo porque el admin no cargó
  SMTP todavía.
- Mismo criterio de seguridad que ya existe: nunca loguear el password ni
  el error completo del transporter, devolver solo mensajes.

**2. Conectar a `quoteCustomOrder`** (`src/lib/custom-orders/actions.ts`):
después de que la cotización se guarda exitosamente en la DB, intentar
mandar un mail al cliente (`users.email` del dueño del pedido) avisando que
su cotización está lista, con el precio y las notas si las hay, y un
recordatorio de que puede verlo en `/mi-cuenta/pedidos`. **Importante**: si
el envío de mail falla (SMTP no configurado, error de conexión, lo que
sea), la cotización ya se guardó y la Server Action tiene que devolver éxito
igual — el mail es un efecto secundario, no debe poder revertir ni bloquear
la operación principal. Registrá en el resultado que devuelve la función
(no en el user-facing, pero sí en lo que puede usar el frontend) si el mail
se mandó o no, para que el admin lo sepa.

**3. Frontend** (`cotizar-form-dialog.tsx` o donde corresponda): si la
cotización se guardó pero el mail no se pudo mandar, mostrá un toast
distinto que lo aclare ("Cotización guardada, pero no se pudo notificar por
mail al cliente — revisá la config SMTP") en vez de un simple "listo"
genérico que esconda el problema.

## Antes de dar por terminado

- `npx tsc --noEmit`, `npm run build`, `npm run test` — los tres pasan.
- Probá contra tu DB real (con la config SMTP que ya cargó el owner) que
  cotizar un pedido de verdad manda el mail — esta vez si hay credenciales
  reales cargadas, así que si podés confirmarlo de verdad, hacelo (no lo
  simules si no podés). Probá también el caso sin SMTP configurado
  (podés desconfigurarlo temporalmente contra un usuario de prueba y
  restaurarlo después) para confirmar que no rompe la cotización.
- Confirmá con `ls`/`find` real los archivos.
- No commitear.

## Reportar de vuelta

Si pudiste confirmar un envío real o no (y por qué), cómo quedó el
`sendTestEmail` refactorizado para usar el helper nuevo sin duplicar
lógica, y confirmación de los 3 checks.
