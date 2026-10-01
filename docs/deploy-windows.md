# Instalación manual de Elsa SYS en Windows 11 (servidor de red)

Esta es la **instalación manual**: copiar archivos, abrir una terminal y correr Docker Compose. No hay instalador `.exe`. Elsa SYS queda en un PC con Windows 11. Las demás cajas, laptops y celulares lo abren en el navegador. Postgres y la aplicación corren en Docker. En esa máquina **no** hay Vite ni `localhost:5173`.

Este archivo es la fuente de verdad para una persona o un agente de IA en la instalación inicial o en un upgrade.

---

## For AI agents (read this first)

You are deploying or upgrading a **local LAN** pharmacy system. You are not deploying to the public internet.

**MUST**

- Before Docker Desktop, enable Windows virtualization (Hyper-V, Containers, Virtual Machine Platform) and install WSL, then reboot. See [Utilidades de Windows para Docker](#utilidades-de-windows-para-docker).
- Run every `docker compose` command from the **repo root** (the folder that contains `docker-compose.yml` and `apps/`). Never from `apps/web` or `apps/api`.
- Use Docker Compose production: `docker compose -p elsasoft -f docker-compose.yml -f docker-compose.prod.yml`
- Start only `postgres` and `app` for day-to-day use
- Keep the named volume `postgres-data` (sales, users, inventory live there)
- Serve on host port **80** (`APP_PORT=80`)
- Tell clients to open the **PC hostname** (for example `http://elsasys/`), never a DHCP IP, when installing the PWA
- On upgrade, recreate **only** the `app` container; leave Postgres running
- After an upgrade, wait until `elsasoft-app` is up and `http://localhost/` returns the login page
- Set a long random `JWT_SECRET` in `.env` on the server (not `change-me-in-production`)
- If a rebuild still uses old files (`CACHED` on `COPY`), run `build --no-cache app` then `up -d app` (two commands)

**MUST NOT**

- Run `npm install`, `npm ci`, `npm run dev`, `npm run dev:web`, or `npm run start:local` on the Windows server
- Bind or tell users to use port **5173**
- Run `docker compose down -v` or `docker volume rm` for `postgres-data`
- Delete or stop `elsasoft-mssql` unless the operator explicitly asked to import a `.bak` again
- Delete `backups/*.bak`
- Install the PWA / desktop app against `http://192.168.x.x/`
- Expose port 80 or 5432 beyond the private LAN
- Copy `node_modules` between machines
- Assume the Settings “Crear respaldo” button works inside the `app` container (it calls `docker exec` on the host). Dump from the host as in [Respaldo](#respaldo)

**Compose project name:** always `-p elsasoft` so the app image is `elsasoft-app:latest`.

**Default login after a legacy import:** username `iveth`, temporary password `FarmaPlus2026!`. Change it after first login.

---



## Qué corre de verdad


| Pieza                 | Dónde                          | Para qué                                                                    |
| --------------------- | ------------------------------ | --------------------------------------------------------------------------- |
| `elsasoft-postgres`   | Volumen Docker `postgres-data` | Base de datos                                                               |
| `elsasoft-app`        | Imagen `elsasoft-app:latest`   | API Nest + SPA compilada (`apps/web/dist`) en el puerto 3001 del contenedor |
| Puerto 80 del Windows | Publicado a 3001               | Lo que abren los clientes                                                   |
| `elsasoft-mssql`      | Opcional                       | Solo para restaurar un `.bak` de SQL Server. No hace falta para vender      |


Los contenedores y la imagen se llaman **elsasoft**. La base **dentro** de Postgres sigue siendo `farmaplus` (usuario `farmacia`): así coincide con el dump `respaldo_*.sql` / `.sql.gz` que ya se exportó.

El `Dockerfile` **es** el build. Con `docker compose … build app` instala dependencias **dentro de la imagen** (`npm install --workspaces --legacy-peer-deps`), compila el frontend (`npm --prefix apps/web run build`) y genera Prisma. El Windows no necesita Node.js. No copies `node_modules` ni hace falta `package-lock.json` para este build.

Al arrancar el contenedor, la app ejecuta `prisma db push` y luego `npm run start:prod` (tsx con `apps/api/tsconfig.json`, necesario para los decoradores de Nest). Un upgrade aplica esquema nuevo así. Los datos de Postgres no se borran.

---



## Requisitos (PC servidor Windows 11)

1. [Utilidades de Windows para Docker](#utilidades-de-windows-para-docker) (Hyper-V, Containers, Virtual Machine Platform, WSL). Reinicia cuando Windows lo pida.
2. Docker Desktop con backend **WSL 2**. Reinicia si el instalador lo pide.
3. Docker Desktop: iniciar al iniciar sesión.
4. Nombre corto del PC (`elsasys` o `farmacia`): Configuración → Sistema → Acerca de → Nombre del dispositivo.
5. Firewall de Windows: permitir TCP **80** de entrada en redes privadas.
6. Node y Git no hacen falta en el servidor. El build corre dentro de Docker.

---



## Utilidades de Windows para Docker

Sin estas funciones, Docker Desktop no levanta bien (motor parado, WSL 2 no disponible, o contenedores que nunca arrancan). Ábrelas en **PowerShell como administrador**, en este orden, y **reinicia** el PC al terminar.

```powershell
dism.exe /Online /Enable-Feature:Microsoft-Hyper-V /All
dism.exe /Online /Enable-Feature:Containers /All
dism.exe /Online /Enable-Feature /FeatureName:VirtualMachinePlatform /All
wsl --install
```

Después del reinicio:

1. Instala o abre **Docker Desktop**.
2. En Docker Desktop: Settings → General → usa el backend **WSL 2**.
3. Espera a que el motor esté en verde (Running) antes de correr `docker compose`.

En Windows 11 Home, Hyper-V a veces no está. Si `Microsoft-Hyper-V` falla, deja **Virtual Machine Platform** + `wsl --install` y el backend WSL 2; eso basta para Docker. En Pro/Enterprise normalmente se habilitan las cuatro.

---



## Dónde correr los comandos (raíz, no apps)

Todos los `docker compose`, `docker load`, `docker save` y el `cd` de PowerShell van en la **raíz del proyecto**. Esa carpeta es la que tiene `apps` **al lado** de los compose, no dentro de `web` ni de `api`.

Así se ve la raíz (ejemplo `C:\ElsaSYS\farmacia`):

```text
C:\ElsaSYS\farmacia\          ← AQUÍ se abre la terminal
  docker-compose.yml
  docker-compose.prod.yml
  Dockerfile
  .env
  package.json
  apps\
    web\                     ← no entres aquí para Docker
    api\                     ← no entres aquí para Docker
  packages\
```

Cómo saber que estás en el sitio correcto: `dir` (o `ls`) muestra `docker-compose.yml` **y** la carpeta `apps` en el mismo listado.

```powershell
cd C:\ElsaSYS\farmacia
```

Mal (Compose no encuentra los YAML o construye mal):

```powershell
cd C:\ElsaSYS\farmacia\apps\web
cd C:\ElsaSYS\farmacia\apps\api
```

`apps/web` es el frontend y `apps/api` el backend. Docker los usa **desde la raíz** (el `Dockerfile` de la raíz construye los dos). No hay que correr `npm` ni `docker` dentro de esas carpetas en el servidor.

---



## Instalación manual: elige una ruta


|                         | Ruta A — construir en el servidor     | Ruta B — llevar la imagen lista (recomendada) |
| ----------------------- | ------------------------------------- | --------------------------------------------- |
| Qué copias              | Repo **sin** `node_modules`           | `elsa-sys.tar` + compose + `.env`             |
| Node en Windows         | No                                    | No                                            |
| Internet la primera vez | Sí (`npm install` dentro de Docker)   | No, si el tar incluye `postgres:16-alpine`    |
| Cuando ya corre         | Se puede borrar el fuente (ver abajo) | El fuente nunca hizo falta                    |


La B es el deploy. La A sirve para reconstruir en la farmacia a partir de una carpeta del repo.

---



## Común: `.env` en el servidor

Carpeta de trabajo (ejemplo): `C:\ElsaSYS\farmacia`

```text
copy .env.example .env
```

Cambia al menos:

```env
JWT_SECRET=<frase larga aleatoria>
POSTGRES_PASSWORD=<no dejes farmacia>
APP_PORT=80
```

Si restaurás un dump de Elsa que usó otros nombres de user/db, `POSTGRES_USER` y `POSTGRES_DB` tienen que coincidir (por defecto `farmacia` / `farmaplus`).

El `DATABASE_URL` de `.env.example` apunta a `localhost`. En producción el contenedor **app** no usa esa URL: Compose inyecta `postgresql://USER:PASSWORD@postgres:5432/DB`.

---



## Ruta A — instalación manual (build en Windows)



### A1. Copiar

Copia el repo **sin** `node_modules`. Hace falta:

- `Dockerfile`, `docker-compose.yml`, `docker-compose.prod.yml`, `package.json`
- `apps/` completa (`apps/web/package.json` y `apps/api/`)
- `packages/` (`packages/domain/package.json`)
- `.env` (creado en el servidor)
- Opcional: `package-lock.json` (el `Dockerfile` actual no lo usa)
- Opcional: `backups/*.bak` solo si van a importar FarmaPlus
- Opcional: `respaldo_DD-MM-YYYY.sql.gz` si van a traer los datos actuales de Elsa

Comprueba que en la raíz se vean `Dockerfile`, `package.json`, `apps\` y `packages\`.

### A2. Construir y arrancar

En la raíz (donde está `docker-compose.yml`, no en `apps\web` ni `apps\api`). PowerShell. La **primera** vez (o si Docker reutiliza capas viejas):

```powershell
docker compose -p elsasoft -f docker-compose.yml -f docker-compose.prod.yml build --no-cache app
docker compose -p elsasoft -f docker-compose.yml -f docker-compose.prod.yml up -d postgres app
```

Son **dos** comandos: el primero construye la imagen; el segundo arranca Postgres y la app. Espera a que `elsasoft-postgres` esté healthy y `elsasoft-app` en marcha.

Si la imagen ya está bien y solo quieres levantar:

```powershell
docker compose -p elsasoft -f docker-compose.yml -f docker-compose.prod.yml up -d postgres app
```

No corras `npm install` ni `npm ci` en Windows. El install es dentro de Docker.

### A3. Abrir

En el servidor: `http://localhost/`

Tiene que salir el login de Elsa SYS, **no** Vite y **no** el puerto 5173.

Si no entra ningún usuario, la base está vacía. Sigue [Restaurar un dump de Elsa](#restaurar-un-dump-de-elsa-sqlgz-o-sql) **antes** de borrar el fuente.

### A4. ¿Se puede borrar el código fuente después?

Sí: `apps/`, `packages/` y lo que solo servía para construir. El programa que corre es la imagen.

**Deja en el disco:**

- `docker-compose.yml`, `docker-compose.prod.yml`, `.env`
- El volumen Docker `postgres-data` (no lo borres)

Si borras el fuente, **ya no puedes hacer upgrade por la ruta A** hasta volver a copiar el repo. Los siguientes upgrades conviene hacerlos por la ruta B.

---



## Ruta B — instalación manual (imagen hecha en otra máquina)

En la máquina de **desarrollo** (Mac/Linux), misma raíz: `docker-compose.yml` junto a `apps/`.

### B1. Construir y empaquetar

```bash
docker compose -p elsasoft -f docker-compose.yml -f docker-compose.prod.yml build app
docker pull postgres:16-alpine
docker save elsasoft-app:latest postgres:16-alpine -o elsa-sys.tar
```

Copia al USB:

- `elsa-sys.tar`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `.env` (secretos de producción, no los de la laptop de desarrollo)

**No** copies `apps/`, `packages/` ni `node_modules`.

### B2. Cargar y arrancar en Windows

En la carpeta de trabajo del servidor (la que tiene los dos `docker-compose*.yml`, no `apps\web`):

```powershell
cd C:\ElsaSYS\farmacia
docker load -i elsa-sys.tar
docker compose -p elsasoft -f docker-compose.yml -f docker-compose.prod.yml up -d postgres app
```

No hay `--build`. Abre `http://localhost/`.

---



## Datos (solo en la primera instalación)

La imagen es el programa. Las ventas viven en Postgres. Elige una:

### Restaurar un dump de Elsa (`.sql.gz` o `.sql`)

Después del primer `up`, Postgres está **vacío**: no hay usuarios ni ventas. Hay que importar el respaldo de Elsa (`.sql.gz` o `.sql`), no el `.bak` de FarmaPlus.

El dump se crea con `--create --clean --if-exists`. Se importa contra la base `postgres` (no `farmaplus`) para que puedan correr `DROP`/`CREATE DATABASE`.

`elsasoft-postgres` tiene que estar **running**. No uses `docker compose down -v` (borra los datos).

Cambia `respaldo_30-09-2026` por el nombre real de tu archivo. La carpeta es la raíz (junto a `docker-compose.yml`).

1. Copia el respaldo a la raíz, por ejemplo `C:\ElsaSYS\farmacia`.
2. Para la app, para que no bloquee la base:

```powershell
cd C:\ElsaSYS\farmacia
docker compose -p elsasoft -f docker-compose.yml -f docker-compose.prod.yml stop app
```

1. Si el archivo es `.sql.gz`, descomprímelo (Windows 11 trae `tar`). Si ya es `.sql`, salta este paso:

```powershell
tar -xf respaldo_30-09-2026.sql.gz
```

1. Impórtalo (tarda si el dump es grande). Al final no debe quedar un `FATAL`:

```powershell
cmd /c "docker exec -i elsasoft-postgres psql -U farmacia -d postgres < respaldo_30-09-2026.sql"
```

1. Vuelve a levantar la app:

```powershell
docker compose -p elsasoft -f docker-compose.yml -f docker-compose.prod.yml up -d app
```

1. Entra en `http://localhost/` con un **usuario que ya existiera** en la máquina de origen (misma contraseña). No hay usuario nuevo de fábrica.

Compara conteos (productos, facturas) con el origen.

Git Bash / WSL (alternativa, sin descomprimir a mano):

```bash
gunzip -c respaldo_30-09-2026.sql.gz | docker exec -i elsasoft-postgres psql -U farmacia -d postgres
```



### Importar un `.bak` de FarmaPlus (opcional)

SQL Server solo para esto:

```powershell
docker compose -p elsasoft -f docker-compose.yml up -d mssql
```

Espera a que `elsasoft-mssql` esté healthy. En Elsa SYS: Configuración → subir el `.bak`. Para vender el día a día no hace falta MSSQL.

**No** borres el `.bak` original.

---



## Red y clientes

En el servidor usa el **nombre del PC**, no una IP de DHCP:

- `http://elsasys/`
- o `http://elsasys.local/` desde iPhone u otro Windows

En cada cliente:

1. Misma Wi‑Fi / LAN. Sin aislamiento de clientes en el router.
2. Abrir ese nombre (puerto 80, sin `:5173`).
3. **Instalar app** contra ese nombre. Nunca contra `http://192.168.x.x/`.

Si un celular no resuelve el nombre, reserva esa IP en el **router** (el Windows sigue en DHCP). No es IP estática configurada en el PC.

---



## Upgrade

Un cambio en la Mac **no** llega solo a la farmacia. Hay que llevar una imagen nueva (o reconstruir en la ruta A).

Postgres se queda. No recrees `postgres-data`. `prisma db push` al arrancar la app actualiza el esquema.

### Upgrade ruta A (el fuente sigue en el servidor)

1. Copia el repo nuevo encima del viejo (sigue sin `node_modules`). Conserva el `.env` que ya está.
2. En la raíz:

```powershell
docker compose -p elsasoft -f docker-compose.yml -f docker-compose.prod.yml build --no-cache app
docker compose -p elsasoft -f docker-compose.yml -f docker-compose.prod.yml up -d app
```

1. **No** pongas `postgres` en el `up` salvo que Postgres esté caído. **No** reconstruyas Postgres.
2. Comprueba `http://localhost/` (login) y una búsqueda o venta.



### Upgrade ruta B (no hay fuente en el servidor)

En desarrollo:

```bash
docker compose -p elsasoft -f docker-compose.yml -f docker-compose.prod.yml build app
docker save elsasoft-app:latest -o elsa-sys-app.tar
```

No hace falta meter Postgres en este tar si el servidor ya tiene `postgres:16-alpine`.

En Windows:

```powershell
docker load -i elsa-sys-app.tar
docker compose -p elsasoft -f docker-compose.yml -f docker-compose.prod.yml up -d app
```

Se reemplaza el contenedor `elsasoft-app`. El volumen `postgres-data` no se toca.

### Si el upgrade falla

```powershell
docker compose -p elsasoft -f docker-compose.yml -f docker-compose.prod.yml logs --tail=100 app
docker compose -p elsasoft -f docker-compose.yml -f docker-compose.prod.yml ps
```

No uses `down -v`. Corrige la imagen o el `.env` y vuelve a `up -d app`.

---



## Respaldo

Saca el dump en el **Windows anfitrión** (CLI de Docker), no desde la SPA, mientras la app corre en Docker:

Git Bash / WSL:

```bash
docker exec elsasoft-postgres pg_dump -U farmacia -d farmaplus --encoding=UTF8 --create --clean --if-exists --blobs | gzip -9 > respaldo_$(date +%d-%m-%Y).sql.gz
```

Guarda copias fuera del servidor (USB u otro PC). Ese archivo se restaura con los [pasos del dump](#restaurar-un-dump-de-elsa-sqlgz).

---



## Día a día


| Acción          | Qué hacer                                                                    |
| --------------- | ---------------------------------------------------------------------------- |
| Encender        | Prender el Windows 11, esperar Docker Desktop, abrir `http://elsasys/`       |
| Apagar          | Apagado normal de Windows. Los contenedores tienen `restart: unless-stopped` |
| Vender          | Cualquier cliente de la LAN en `http://elsasys/`                             |
| Actualizar Elsa | [Upgrade](#upgrade)                                                          |
| Sacar datos     | [Respaldo](#respaldo)                                                        |


---



## Verificar (instalación o upgrade)

1. `docker ps` muestra `elsasoft-postgres` (healthy) y `elsasoft-app`.
2. `http://localhost/` es el login de Elsa SYS, no Vite.
3. Desde otro dispositivo, `http://<nombre-del-pc>/` carga. Sin puerto 5173.
4. El login funciona. En Contado, buscar un producto devuelve filas si la base tiene productos.
5. Si instalaron la PWA, fue desde la URL del nombre del PC.

---



## Problemas frecuentes


| Síntoma                                                                   | Causa probable                                                                                                                                 |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `no configuration file provided` o no encuentra `docker-compose.yml`      | La terminal está en `apps\web` o `apps\api`. Vuelve a la raíz ([dónde correr los comandos](#dónde-correr-los-comandos-raíz-no-apps)).          |
| El sitio está en `:5173`                                                  | Alguien arrancó Vite. Páralo. Producción es el puerto 80.                                                                                      |
| `localhost` va, los otros PCs no                                          | Firewall del 80, aislamiento Wi‑Fi, o usaron otra IP                                                                                           |
| La PWA queda muerta tras reiniciar el router                              | La instalaron con IP de DHCP. Reinstalar desde `http://elsasys/`                                                                               |
| Catálogo vacío o no entra el usuario tras el deploy                       | Postgres arrancó limpio. Restaura el `.sql` / `.sql.gz` ([pasos](#restaurar-un-dump-de-elsa-sqlgz-o-sql))                                      |
| Login 401 al cambiar de máquina                                           | Otro `JWT_SECRET`; hay que volver a entrar. Los datos siguen en Postgres                                                                       |
| Falla “Crear respaldo” en Configuración                                   | Esperable en este layout Docker. Dump desde el host ([Respaldo](#respaldo))                                                                    |
| Hicieron `down` y no hay datos                                            | Usaron `-v`. No lo hagas. Restaura el `.sql.gz` si existe                                                                                      |
| Docker Desktop no arranca o WSL 2 no está                                 | Faltan [utilidades de Windows](#utilidades-de-windows-para-docker). PowerShell admin, los 4 comandos, reiniciar                                |
| `No workspaces found: --workspace=web`                                    | Falta `apps/web/package.json` o se usó un lock viejo. Copia `apps/` y `packages/` completos. El `Dockerfile` actual instala con `--workspaces` |
| `npm ci` / `Missing: farmaplus@` / lock desfasado                         | El build **no** usa `npm ci` ni el lock. Copia el `Dockerfile` actual y reconstruye con `--no-cache`                                           |
| `ERESOLVE` / `react-apexcharts` pide ApexCharts 4                         | `apps/web/package.json` debe fijar `apexcharts` 3.50.0 y `react-apexcharts` 1.4.1. El install usa `--legacy-peer-deps`                         |
| `Parameter decorators only work when experimental decorators are enabled` | La API debe arrancar con `npm run start:prod` (tsx + `apps/api/tsconfig.json`). Copia `package.json` y el `Dockerfile` actuales                |
| `elsasoft-app` se reinicia solo                                           | `docker logs elsasoft-app`. Prisma suele estar bien; el fallo está después, al arrancar Nest                                                   |
| Build marca `CACHED` en `COPY` y el error no cambia                       | Las capas son viejas. `build --no-cache app` y luego `up -d app`                                                                               |


