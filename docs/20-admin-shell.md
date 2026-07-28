# Prompt: shell del admin (sidebar unificado)

Pegar en Claude Code. Guardalo en `docs/dev-log/20-admin-shell.md` si
querés mantener el orden. Es el primero de 4 prompts (20, 21, 22, 23) — este
va primero porque el de "Usuarios" (21) depende del sidebar que arma este.

---

Header confirmado localmente. Sin commitear ni pushear al terminar.
Confirmá con `ls`/`find` real los archivos antes de reportar terminado.

## Contexto

Hoy `/admin/dashboard`, `/admin/productos`, `/admin/categorias`,
`/admin/pedidos-custom` y `/admin/configuracion` son páginas sueltas sin
navegación entre sí — cada una es una isla, hay que escribir la URL a mano
para moverse entre secciones. El owner pidió un panel unificado, no más
páginas sueltas. Se resuelve con un layout compartido (sidebar), **sin
tocar la lógica interna de cada página todavía** — eso es pura navegación.

## Qué hacer

**1. `src/app/(admin)/layout.tsx`** (nuevo): Server Component, trae
`session` con `auth()`. Guard de rol staff (`admin`/`empleado`, mismo
criterio que ya usa `src/proxy.ts`) — esto es defensa en profundidad
adicional, no reemplaza al proxy.

**2. `src/components/admin-sidebar.tsx`** (nuevo, Client Component si
necesita `usePathname()` para marcar la sección activa): links a Dashboard
(`/admin/dashboard`), Productos (`/admin/productos`), Categorías
(`/admin/categorias`), Pedidos a medida (`/admin/pedidos-custom`).
"Usuarios" (`/admin/usuarios`) y "Configuración" (`/admin/configuracion`)
**solo visibles si `session.user.role === "admin"`** — empleado no las ve
(Configuración ya es admin-only hoy; Usuarios se construye admin-only en el
próximo prompt, dejá el link ya armado aunque la página todavía no exista).

**3. El layout renderiza** `<AdminSidebar />` + `<main>{children}</main>`,
con un link "Volver a la tienda" (a `/`) y el nombre/email del usuario +
`LogoutButton` (reusar el componente existente, `src/components/logout-button.tsx`
— no crear otro).

**4. Responsive**: en mobile, el sidebar colapsa detrás de un botón "Menu"
(mismo criterio simple ya usado en `site-header.tsx` — sin librerías
nuevas, sin animaciones complejas).

**5. No cambiar la lógica interna** de dashboard/productos/categorias/
pedidos-custom/configuracion en este paso — es pura navegación/shell
alrededor de lo que ya existe y funciona.

## Antes de dar por terminado

- `npx tsc --noEmit`, `npm run build`, `npm run test` — los tres pasan.
- Confirmá que las 5 páginas admin existentes siguen funcionando igual
  (mismo comportamiento de siempre, ahora con el sidebar alrededor).
- Confirmá que un `empleado` no ve "Usuarios" ni "Configuración" en el
  sidebar (podés simularlo en código, misma limitación de siempre sobre
  browser real).
- Confirmá con `ls`/`find` real los archivos.
- No commitear.

## Reportar de vuelta

Cómo verificaste el guard de rol en el sidebar (qué ve `empleado` vs
`admin`), y confirmación de los 3 checks.
