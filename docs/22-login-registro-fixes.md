# Prompt: redirect por rol + fix de navegación post-login/registro

Pegar en Claude Code. Guardalo en `docs/dev-log/22-login-registro-fixes.md`
si querés mantener el orden. Independiente de los prompts 20/21 — se puede
correr en cualquier momento.

---

Sin commitear ni pushear al terminar. Confirmá con `ls`/`find` real los
archivos antes de reportar terminado.

## Contexto

Dos problemas confirmados por el owner con clicks reales en un browser (no
en el entorno simulado que usás vos):

1. Hoy el login de un `admin`/`empleado` termina en `/` (home pública) en
   vez de en su panel — no tiene sentido para alguien que gestiona la
   tienda, no la compra.
2. En producción (VPS), clickear "Ingresar" a veces no navega a la página
   de destino aunque la sesión sí se crea correctamente (confirmado:
   navegando manualmente a otra URL ya se ve logueado). **En local
   (`npm run dev`) esto no se reprodujo.** Es consistente con un problema
   conocido de next-auth + App Router: usar `router.push()`/`router.refresh()`
   después de un `signIn` con `redirect:false` puede pisarse con el cache
   de Server Components en una navegación "soft" en algunos entornos. Un
   reload completo del documento evita el problema de raíz sin depender de
   por qué el cache se comporta distinto en cada entorno.

## Qué hacer

**1. `src/app/(site)/login/login-form-client.tsx`**: después de un
`signIn` exitoso y de `mergeGuestCartIntoUser()`, reemplazar
`router.push(callbackUrl); router.refresh();` por
`window.location.assign(target)` (recarga completa del documento —
garantiza que el server vuelva a leer la cookie de sesión recién seteada,
sin depender del cache de navegación de Next).

`target` se calcula así: si el usuario recién logueado tiene rol `admin` o
`empleado`, ignorar el `callbackUrl` del querystring y mandarlo siempre a
`/admin/dashboard`; si es `cliente`, usar el `callbackUrl` tal cual ya se
sanitiza hoy en `page.tsx` (default `/`). Vas a necesitar el rol del
usuario recién logueado — el resultado de `signIn` no lo trae directo;
usá `getSession()` de `next-auth/react` (o el mecanismo equivalente que ya
esté disponible) en vez de inventar un endpoint nuevo.

**2. `src/app/(site)/crear-cuenta/crear-cuenta-form-client.tsx`**: mismo
cambio de `router.push`+`refresh` a `window.location.assign("/")` (el
registro siempre crea `cliente`, destino fijo `/`, no hace falta lógica de
rol acá). Además: agregar un toast de éxito ("Cuenta creada correctamente")
con `sonner` (ya es dependencia, se usa en toda la app) **antes** de la
navegación — hoy no se muestra ningún aviso y el owner lo reportó como bug.
El toast tiene que alcanzar a verse; si no podés garantizar que sobrevive
un `window.location.assign` inmediato, resolvelo con un pequeño delay
razonable y dejalo explícito en el reporte (no asumas que "andaría bien" si
no lo pudiste confirmar).

## Antes de dar por terminado

- `npx tsc --noEmit`, `npm run build`, `npm run test` — los tres pasan.
- No podés probar el click real (misma limitación de siempre) — verificá
  en código que el cálculo del destino por rol es correcto, y dejá
  documentado en el reporte que este cambio apunta a resolver el bug de
  producción, pero que la validación final la hace el owner en su VPS.
- Confirmá con `ls`/`find` real los archivos.
- No commitear.

## Reportar de vuelta

Cómo resolviste el destino por rol sin poder usar `auth()` en el cliente,
qué decidiste sobre el toast + el timing de la navegación, y confirmación
de los 3 checks.
