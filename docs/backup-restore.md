# Backup y restore (migrar a otro entorno)

Guia operativa, no un spec de implementacion (a diferencia del resto de
`docs/`). Pensada para dos casos: (1) respaldo periodico por las dudas, y
(2) migrar todo el sitio a otro VPS/entorno sin perder nada.

Hay tres cosas que respaldar, y **las tres son necesarias** — falta una sola
y la migracion queda incompleta:

1. **Base de datos Postgres** (productos, ordenes, usuarios, todo el
   negocio).
2. **Carpeta de uploads** (`/app/public/uploads` en el contenedor):
   comprobantes de pago, fotos de producto, archivos 3D de pedidos a
   medida. Vive en un volumen aparte, no en la imagen ni en la base.
3. **Variables de entorno**, en particular `SETTINGS_ENCRYPTION_KEY`.

## Por que `SETTINGS_ENCRYPTION_KEY` es el punto critico

Los secretos que se cargan desde `/admin/configuracion` (contrasena SMTP,
access token de Mercado Pago, bot token de Telegram) se guardan encriptados
en la tabla `stores`, no en texto plano. La clave para desencriptarlos es
`SETTINGS_ENCRYPTION_KEY` — **vive solo como variable de entorno, nunca en
la base de datos.**

Si migras la base de datos a un entorno nuevo pero no llevas la misma
`SETTINGS_ENCRYPTION_KEY`, esos campos encriptados quedan ahi pero son
**irrecuperables** — no hay forma de desencriptarlos con una clave distinta
a la que los encripto. El sitio no se rompe (los badges van a mostrar
"Configurado" porque el campo no esta vacio), pero cualquier intento de
*usar* esos secretos (mandar un mail, cobrar con Mercado Pago, mandar un
Telegram) va a fallar. La unica solucion en ese caso es volver a cargar cada
secreto a mano desde el panel.

**Por eso**: guardate `SETTINGS_ENCRYPTION_KEY` en un gestor de contrasenas
aparte del resto, el mismo dia que la generes. No es opcional para migrar.

## Que respaldar exactamente

Lista completa de variables de entorno a llevar al nuevo entorno (copiar
todas las que tengan valor en el actual — no hace falta commitear nada,
viven solo en EasyPanel):

```
DATABASE_URL              # se regenera sola apuntando al Postgres nuevo
AUTH_SECRET                # NO regenerar -- si cambia, se invalidan todas las sesiones activas
AUTH_URL                   # URL publica del entorno nuevo
AUTH_TRUST_HOST

MP_ACCESS_TOKEN
MP_PUBLIC_KEY
MP_WEBHOOK_SECRET

UPLOADS_DIR                 # normalmente no seteada (usa el default ./public/uploads)
UPLOADS_MAX_SIZE_MB

SETTINGS_ENCRYPTION_KEY     # CRITICA, ver seccion de arriba -- llevar tal cual, nunca regenerar

NEXT_PUBLIC_UMAMI_WEBSITE_ID
NEXT_PUBLIC_UMAMI_SRC

GLITCHTIP_DSN
NEXT_PUBLIC_GLITCHTIP_DSN
```

`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` no hace falta llevarlas: son solo
para el primer arranque en un entorno sin usuarios (`src/instrumentation.ts`
las usa una sola vez). Si ya migraste la base con usuarios existentes, no se
van a usar.

## Backup de la base de datos

**En EasyPanel** (produccion): entra a la Console del servicio de Postgres
(`bd` en la nomenclatura de `CLAUDE.md`) y corre:

```bash
pg_dump -U tienda3d -d tienda3d -F c -f /tmp/backup.dump
```

(ajusta el usuario/nombre de base si los tuyos son distintos — estan en
`DATABASE_URL`). El `-F c` es el formato "custom" de Postgres, comprimido y
mas rapido de restaurar que un `.sql` plano. Despues bajate ese archivo:
EasyPanel no tiene un boton de "descargar archivo" directo desde la
Console, asi que la forma mas simple es:

```bash
# Desde tu maquina, si tenes acceso SSH al VPS:
docker exec <container_bd> pg_dump -U tienda3d -d tienda3d -F c > backup-$(date +%F).dump
```

Esto corre `pg_dump` desde afuera del contenedor y ya te deja el archivo en
tu maquina directamente, sin pasos intermedios.

**En local** (docker-compose):

```bash
docker compose exec db pg_dump -U tienda3d -d tienda3d -F c -f /tmp/backup.dump
docker compose cp db:/tmp/backup.dump ./backup-$(date +%F).dump
```

## Restore de la base de datos

En el entorno nuevo, con el servicio de Postgres ya arriba (vacio, recien
creado) pero **antes** de que la app corra sus migraciones automaticas:

```bash
# Si restauras via SSH directo al contenedor:
docker exec -i <container_bd_nuevo> pg_restore -U tienda3d -d tienda3d --clean --if-exists < backup-2026-07-31.dump
```

`--clean --if-exists` hace que borre y recree tablas si ya existian (util
si el schema fue creado por un primer arranque en vacio de la app antes de
restaurar). Si el restore se hace ANTES del primer arranque de la app
(recomendado), no hace falta `--clean`.

Despues de restaurar, arranca (o reiniciá) el servicio `web` — `runMigrations()`
en `src/instrumentation.ts` corre las migraciones pendientes que falten
sobre esta base ya restaurada (es idempotente, no rompe nada si ya estan
todas aplicadas).

## Backup y restore de los uploads

El volumen `uploads_data` (local) / el volumen montado en
`/app/public/uploads` (EasyPanel) tiene todo lo subido por usuarios:
comprobantes, fotos de producto, archivos 3D.

**En EasyPanel**, desde la Console del servicio `web`:

```bash
tar -czf /tmp/uploads-backup.tar.gz -C /app/public uploads
```

Igual que con la base, bajalo desde tu maquina via SSH si tenes acceso al
VPS:

```bash
docker exec <container_web> tar -czf - -C /app/public uploads > uploads-backup-$(date +%F).tar.gz
```

**Restore** en el entorno nuevo (antes de que reciba trafico real, para no
pisar archivos nuevos con el backup viejo):

```bash
docker exec -i <container_web_nuevo> tar -xzf - -C /app/public < uploads-backup-2026-07-31.tar.gz
```

**En local** (docker-compose), mismo patron con `docker compose exec app`
en vez de `docker exec <container>`.

## Checklist para migrar a un entorno nuevo

1. Copiar **todas** las variables de entorno de la seccion de arriba al
   nuevo servicio en EasyPanel (especialmente `SETTINGS_ENCRYPTION_KEY` y
   `AUTH_SECRET`, sin regenerarlas).
2. Levantar el servicio de Postgres nuevo (vacio).
3. Restaurar el dump de la base (`pg_restore`, ver arriba).
4. Restaurar el volumen de uploads (`tar -xzf`, ver arriba).
5. Deployar el servicio `web` apuntando a esa base ya restaurada — las
   migraciones automaticas se aplican solas si falta alguna.
6. Apuntar el DNS del dominio al nuevo entorno.
7. Verificar: login funciona (confirma `AUTH_SECRET` correcto), un
   comprobante viejo se puede ver (confirma que el volumen de uploads
   restauro bien), y probar "Enviar email de prueba" / "Probar notificacion
   de error" desde `/admin/configuracion` (confirma que
   `SETTINGS_ENCRYPTION_KEY` es la misma y los secretos siguen siendo
   utilizables).
