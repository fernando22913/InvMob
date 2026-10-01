# Inventario — Sistema de Gestión de Inventario

Aplicación de inventario con frontend **Ionic + Angular**, backend **Node.js + Express**,
base de datos **PostgreSQL** y empaquetado móvil con **Capacitor + Android**.

El backend corresponde a un port funcional de un servicio original en Python/FastAPI:
mantiene los mismos códigos de estado, formatos de error, paginación y manejo de precios
como texto para conservar compatibilidad de contrato.

---

## 1. Descripción

**Inventario** es un sistema de gestión de inventario que permite administrar productos,
existencias, movimientos de stock, ventas, compras, contactos (clientes y proveedores),
catálogo (categorías y unidades), bodegas y usuarios con roles. Está pensado para operar
desde el navegador (aplicación web) y como aplicación Android empaquetada con Capacitor.

Su propósito es centralizar el control de stock y las operaciones comerciales en un único
panel, con control de acceso mediante autenticación y permisos por rol.

## 2. Problema / necesidad

Llevar el inventario y las operaciones de venta/compra en hojas de cálculo o registros
separados provoca desajustes de stock, falta de trazabilidad y poca claridad sobre el
estado real del negocio. Este sistema resuelve ese problema al:

- Mantener el stock actualizado de forma transaccional (cada venta, compra o ajuste
  genera un movimiento de inventario).
- Centralizar catálogo, contactos y bodegas en una sola base de datos.
- Restringir operaciones sensibles a usuarios autenticados y con rol adecuado.
- Ofrecer una vista resumen (panel) con productos, stock bajo y operaciones recientes.

## 3. Funcionalidades principales

Todas las funcionalidades listadas están implementadas en el proyecto actual:

- **Autenticación** con correo y contraseña (JWT) y persistencia de sesión.
- **Panel (Dashboard)** con métricas: número de productos, stock total, productos con
  stock bajo, compras y ventas recientes.
- **Productos**: CRUD con SKU, precios de compra/venta, stock mínimo, categoría y unidad.
- **Inventario**: consulta de stock por producto/bodega y listado de movimientos;
  ajustes manuales de existencias.
- **Ventas**: registro de ventas con múltiples líneas, descuento de stock y detalle.
- **Compras**: registro de compras con múltiples líneas, aumento de stock y detalle.
- **Clientes**: CRUD de clientes.
- **Proveedores**: CRUD de proveedores.
- **Bodegas**: CRUD de bodegas.
- **Categorías**: CRUD de categorías (con categoría padre opcional).
- **Unidades**: CRUD de unidades de medida (nombre y símbolo).
- **Usuarios**: CRUD de usuarios con asignación de roles (solo administradores).
- **Roles**: gestión de roles (solo administradores).
- Búsqueda, filtros, paginación, formularios con validación y confirmaciones de borrado.

El control de acceso verificado es: **admin** (acceso completo) y **operator**
(acceso a operación, sin gestión de usuarios/roles).

## 4. Tecnologías utilizadas

| Tecnología | Versión (según el proyecto) | Propósito |
|---|---|---|
| Ionic Angular | `^9.0.0` | Componentes de UI móvil/web y navegación. |
| Angular | `22.1.7` | Framework del frontend (componentes standalone, rutas lazy). |
| TypeScript | `~6.0.0` (frontend) / `^5.7.3` (backend) | Tipado estático en todo el código. |
| RxJS | `~7.8.0` | Manejo reactivo de peticiones y estado de listados. |
| Capacitor | `8.5.2` | Empaquetar la app web en un proyecto Android nativo. |
| Node.js + npm | (sin versión fijada; `@types/node` `^22`) | Entorno de ejecución y gestor de paquetes del backend. |
| Express | `^4.21.2` | Servidor HTTP / API REST. |
| `pg` | `^8.13.1` | Cliente PostgreSQL para Node.js. |
| Zod | `^3.24.1` | Validación de datos de entrada en el backend. |
| jsonwebtoken / bcryptjs | `^9.0.2` / `^2.4.3` | Emisión de tokens JWT y hash de contraseñas. |
| PostgreSQL | `16` (`postgres:16-alpine`) | Base de datos relacional. |
| Docker / Docker Compose | — | Ejecutar PostgreSQL en contenedor. |
| Android SDK + Gradle | compileSdk/targetSdk `36`, minSdk `24`, Gradle `8.14.3` | Compilar y empaquetar la aplicación Android. |

## 5. Arquitectura general

```
 Frontend (navegador)
 Ionic + Angular + TypeScript
        │
        │ HTTP/JSON (REST, JWT Bearer)
        ▼
 Backend  →  http://localhost:8000/api
 Node.js + Express + TypeScript
        │
        │ SQL (cliente pg)
        ▼
 PostgreSQL 16  (contenedor Docker, puerto host 5433)

 Aplicación Android
 El mismo frontend web se empaqueta con Capacitor y se ejecuta
 dentro de un WebView nativo; consume la misma API del backend.
```

- El **frontend** consume la API REST por HTTP/JSON; el token JWT se envía en la
  cabecera `Authorization: Bearer <token>`.
- El **backend** valida las peticiones (Zod), aplica autenticación/autorización y
  opera sobre PostgreSQL.
- La **base de datos** corre en un contenedor Docker; los datos persisten en un volumen.
- La **aplicación Android** es la build web empaquetada con Capacitor dentro de un
  WebView, por lo que reutiliza exactamente la misma lógica y API.

## 6. Estructura del proyecto

```
inventario/
├── docker-compose.yml          # Servicio PostgreSQL (único contenedor)
├── .env.example                # Variables para docker-compose
├── db/
│   └── init.sql                # Esquema SQL (se carga solo en el primer arranque)
├── docs/                       # Carpeta para documentación/capturas (vacía)
├── backend/                    # API Node.js + Express + TypeScript
│   ├── src/
│   │   ├── app.ts              # Definición de la app y montaje de rutas /api
│   │   ├── server.ts           # Arranque del servidor
│   │   ├── config.ts           # Variables de entorno y validación
│   │   ├── db.ts               # Pool y transacciones PostgreSQL
│   │   ├── routes/             # Rutas por recurso
│   │   ├── services/           # Lógica de negocio
│   │   ├── schemas/            # Validaciones (Zod)
│   │   ├── middleware/         # Auth, admin, manejo de errores
│   │   └── utils/              # Utilidades (dinero, paginación, auth, etc.)
│   ├── scripts/
│   │   ├── seed.ts             # Roles + primer administrador (idempotente)
│   │   └── smoke.ts            # Prueba end-to-end de la API
│   ├── .env.example
│   └── package.json
├── frontend/                   # Aplicación Ionic + Angular
│   ├── src/
│   │   ├── app/
│   │   │   ├── app.component.* # Layout y menú lateral
│   │   │   ├── app.routes.ts   # Rutas/componentes lazy
│   │   │   ├── core/           # Servicio de auth, guard e interceptor
│   │   │   ├── models/         # Modelos de la API
│   │   │   ├── pages/          # Páginas: login, dashboard, products, sales, ...
│   │   │   ├── services/       # Clientes HTTP por recurso
│   │   │   └── shared/         # Estado de listas y formato
│   │   ├── environments/       # URLs de API (dev, prod, mobile)
│   │   ├── theme/              # Variables de tema
│   │   └── global.scss
│   ├── android/                # Proyecto Android generado por Capacitor
│   ├── capacitor.config.ts     # Configuración de Capacitor
│   ├── angular.json            # Configuraciones de build (production/development/mobile)
│   └── package.json
└── README.md
```

## 7. Requisitos previos

- **Node.js y npm** (para backend y frontend).
- **Docker y Docker Compose** (para ejecutar PostgreSQL 16).
- Para desarrollo **Android** (opcional):
  - **Android SDK** (el proyecto compila con `compileSdk`/`targetSdk` 36 y `minSdk` 24).
  - **JDK 21** (usado para el build de Android).
  - **Android Studio** y/o las **Android command-line tools** + Gradle (el wrapper
    `gradlew` ya viene incluido en `frontend/android/`).
  - Un **emulador** o un **dispositivo físico** con depuración USB.

> No es necesario instalar Ionic CLI ni Angular CLI de forma global: los comandos se
> ejecutan mediante los scripts de `npm` y `npx` (las dependencias `@angular/cli` y
> `@capacitor/cli` están en `devDependencies`).

## 8. Instalación

Instalar dependencias de cada proyecto:

```bash
# Backend
cd backend
npm install
cp .env.example .env

# Frontend
cd ../frontend
npm install
```

En `backend/.env` genera una `SECRET_KEY` segura (mínimo 32 caracteres, no puede ser
un valor de ejemplo; el backend se niega a iniciar si no cumple):

```bash
openssl rand -base64 48
# Copia el resultado en SECRET_KEY dentro de backend/.env
```

## 9. Base de datos (Docker Compose)

Levantar PostgreSQL 16:

```bash
# Desde la raíz del proyecto
docker compose up -d db
docker compose ps
```

El contenedor expone PostgreSQL en el puerto **5433** del host (5432 dentro del
contenedor) con la base `inventario_generico`. El esquema se carga desde `db/init.sql`
**solo la primera vez** que se arranca un volumen vacío.

Los datos persisten en el **volumen de Docker** `pgdata`. Distingue bien entre detener
y eliminar el volumen:

```bash
# Detiene y elimina contenedores/red, PERO conserva los datos (volumen)
docker compose down

# Detiene y ADEMÁS elimina los volúmenes -> BORRA los datos de PostgreSQL
docker compose down -v
```

> `docker compose down -v` **elimina la base de datos**. Úsalo solo si quieres partir
> de cero (por ejemplo, para recargar el esquema de `db/init.sql`).

## 10. Backend

```bash
cd backend

# Crea los roles (admin, operator) y el primer administrador si FIRST_ADMIN_* está definido (idempotente)
npm run seed

# Desarrollo con recarga automática (tsx watch) en http://localhost:8000/api
npm run dev
```

Scripts disponibles (`backend/package.json`):

| Comando | Descripción |
|---|---|
| `npm run dev` | Desarrollo con recarga automática (`tsx watch`). |
| `npm run seed` | Crea roles y primer administrador si faltan (idempotente). |
| `npm run build` | Compila TypeScript a `dist/`. |
| `npm start` | Ejecuta el backend compilado (`node dist/server.js`). |
| `npm run typecheck` | Verificación de tipos sin emitir. |
| `npm run smoke` | Prueba end-to-end de la API (requiere servidor en :8000, BD sembrada y `SMOKE_ADMIN_EMAIL`/`SMOKE_ADMIN_PASSWORD`). |

## 11. Frontend web (Ionic/Angular)

```bash
cd frontend

# Servidor de desarrollo (ng serve) en http://localhost:4200
npm start
```

Scripts disponibles (`frontend/package.json`):

| Comando | Descripción |
|---|---|
| `npm start` | Servidor de desarrollo (`ng serve`). |
| `npm run build` | Build de producción (genera `www/`). |
| `npm run watch` | Build en modo desarrollo con recarga. |
| `npm run lint` | Análisis estático con ESLint. |
| `npm test` | Ejecuta las pruebas unitarias (Vitest). |

## 12. Aplicación Android

La aplicación Android se genera a partir del mismo frontend web:

```
Angular / Ionic
      ↓  npx ng build --configuration mobile
Build móvil (usa environment.mobile.ts)
      ↓  npx cap sync android
Capacitor (copia el build web al proyecto Android)
      ↓
Proyecto Android (frontend/android/)
      ↓  Gradle (./gradlew)
APK
```

Pasos:

```bash
cd frontend

# 1) Build web con la configuración móvil (fuente: src/environments/environment.mobile.ts)
npx ng build --configuration mobile

# 2) Sincronizar los assets web y plugins con el proyecto Android
npx cap sync android

# 3a) Abrir en Android Studio y ejecutar desde ahí
npx cap open android

# 3b) O compilar por línea de comandos
cd android
./gradlew assembleDebug     # APK de depuración
./gradlew assembleRelease   # APK de release (sin firmar por defecto)
```

Ejecutar en un **emulador** o **dispositivo conectado**:

```bash
# Desde frontend/: compila, instala y lanza en el dispositivo/emulador
npx cap run android

# Alternativa con Gradle (equipo conectado por ADB)
cd android
./gradlew installDebug
```

**Dispositivo físico por USB/ADB** (soportado por el proyecto):

1. Activa las *Opciones de desarrollador* y la *Depuración USB* en el dispositivo.
2. Conéctalo por USB y verifica: `adb devices`.
3. Ejecuta `npx cap run android` (o `./gradlew installDebug`).

> La URL del backend para la build móvil se define en
> `frontend/src/environments/environment.mobile.ts`. Su valor actual es
> `http://127.0.0.1:8000/api`; ajústalo al host donde corre el backend según tu
> entorno de prueba (el propio archivo comenta que `10.0.2.2` es el loopback del host
> visto desde el emulador Android).

## 13. Administrador inicial (desarrollo)

No hay credenciales hardcodeadas en el repositorio. El administrador se crea a partir
de las variables `FIRST_ADMIN_EMAIL` y `FIRST_ADMIN_PASSWORD` definidas en
`backend/.env` (archivo local, **no versionado**):

```bash
# backend/.env
FIRST_ADMIN_EMAIL=tu-correo@dominio.com
FIRST_ADMIN_PASSWORD=una-contrasena-segura
```

- El script `npm run seed` crea los roles **admin** y **operator**, y el primer usuario
  administrador usando esas variables. Si no están definidas, el seed **no** crea
  administrador y solo lo informa.
- No existe un usuario `operator` por defecto: el rol se crea, pero el usuario debe
  crearse desde el panel de **Usuarios** (como administrador).
- **Nunca subas `backend/.env` al repositorio** (ya está en `.gitignore`) y cambia las
  credenciales y la `SECRET_KEY` antes de exponer el sistema.

## 14. API / Backend (resumen)

- **URL base en desarrollo:** `http://localhost:8000/api` (`environment.ts`).
- **Salud:** `GET /health` y `GET /api/health` → `{"status":"ok","version":"0.1.0"}`.
- **Autenticación:** JWT tipo Bearer.
  - `POST /api/auth/login` con `{ "email": "...", "password": "..." }`
    → `{ "access_token": "...", "token_type": "bearer" }`.
  - Las peticiones autenticadas envían `Authorization: Bearer <token>`.
- **Formato:** JSON. Los listados usan `{ items, total, page, size, pages }`
  (tamaño de página máximo 100).
- **Errores:** validación con estilo FastAPI (`422` con `{ detail: [...] }`) y códigos
  `401` (no autenticado), `403` (sin permisos de administrador), `404` (no encontrado)
  y `409` (conflicto, por ejemplo SKU duplicado).
- Rutas protegidas: usuarios y roles son **solo para administradores**; el resto de
  recursos requieren autenticación.

## 15. APK Android

El proyecto puede generar una aplicación Android instalable usando Capacitor y Gradle.
Las build por defecto quedan en:

| Artefacto | Ubicación |
|---|---|
| APK de depuración | `frontend/android/app/build/outputs/apk/debug/app-debug.apk` |
| APK de release | `frontend/android/app/build/outputs/apk/release/app-release.apk` |
| AAB (Play Store) | `frontend/android/app/build/outputs/bundle/release/app-release.aab` |

Comandos para generarlos:

```bash
cd frontend/android
./gradlew assembleDebug     # APK de depuración
./gradlew assembleRelease   # APK de release
./gradlew bundleRelease     # AAB
```

> Las carpetas `node_modules/`, `dist/`, `www/` y `frontend/android/app/build/` están
> excluidas en `.gitignore`: no deben subirse al repositorio.

## 16. Evidencia de ejecución (capturas)

Actualmente el repositorio **no incluye capturas de pantalla** (la carpeta `docs/`
está vacía). Cuando se generen, se recomienda guardarlas en `docs/screenshots/`.

Nombres sugeridos para las capturas (aún pendientes de agregar):

```text
docs/screenshots/login-web.png
docs/screenshots/dashboard-web.png
docs/screenshots/products-web.png
docs/screenshots/inventory-web.png
docs/screenshots/sales-web.png
docs/screenshots/purchases-web.png
docs/screenshots/login-android.png
docs/screenshots/dashboard-android.png
```

Una vez agregadas, se podrán referenciar en Markdown, por ejemplo:

```markdown
![Panel web](docs/screenshots/dashboard-web.png)
![Panel Android](docs/screenshots/dashboard-android.png)
```

## 17. Estado del proyecto

- **Backend:** funcional; incluye script de datos iniciales (`npm run seed`) y una prueba
  end-to-end (`npm run smoke`) que se ejecuta contra la API real.
- **Aplicación web:** funcional; compila con `npm run build`.
- **Aplicación Android:** funcional; se construye con Capacitor + Gradle y fue verificada
  en un emulador Android (inicio de sesión, persistencia de token, navegación, panel y
  los módulos principales).
- **Base de datos:** PostgreSQL 16 en Docker con esquema cargado desde `db/init.sql`.

## 18. Autor

- **Autor:** _[Nombre del autor / institución — completar]_
- **Proyecto:** Inventario — Sistema de Gestión de Inventario
