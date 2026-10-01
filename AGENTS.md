# AGENTS.md

Inventory app (Node/Express + Ionic Angular) that is a **behavioral port of an
original Python/FastAPI service**. Comments like "mirrors FastAPI" are
intentional parity constraints: keep status codes, error shapes, pagination, and
decimal-as-string behavior the same instead of "improving" them.

## Layout

- `backend/` — Express + TypeScript API (`src/server.ts` -> `src/app.ts`). Every
  endpoint is mounted under `/api`; `/health` and `/api/health` are public. Layered
  as `routes/` -> `services/` -> `schemas/` (zod), with `middleware/` (auth, admin,
  errors) and `utils/` (money, pagination, params, security, crud, http).
- `frontend/` — Ionic 9 + Angular 22 standalone app (`src/main.ts`,
  `src/app/app.routes.ts`). No NgModules; all pages lazy-load via `loadComponent`.
  Pages in `src/app/pages/`; `core/` (auth service/guard/interceptor, api-error),
  `services/` (HTTP per resource), `models/`, `shared/`.
- `frontend/android/` — Capacitor Android project (Gradle wrapper included). The web
  build in `www/` is copied in with `npx cap sync android`.
- `db/init.sql` — schema only (exported from old Alembic revisions). Loaded by the
  Postgres container **only on first boot of an empty volume**; there is no
  migration toolchain. To change schema, edit `init.sql` and recreate the volume.
- `docker-compose.yml` — Postgres only. Host port is **5433** (container 5432); env
  comes from the root `.env.example`.
- `backend/scripts/` — `seed.ts` (idempotent roles + first admin) and `smoke.ts`.
- `README.md` — user-facing docs (Spanish): setup, Android, credentials, API summary.
  `docs/` is reserved for screenshots (currently empty).
- `frontend/.agents/skills/` + `frontend/skills-lock.json` — installed agent skills
  (vitest, accessibility, frontend-design, nodejs-backend-patterns, nodejs-best-practices).

## Run / setup order

```bash
docker compose up -d db          # Postgres on localhost:5433
# backend
cd backend && npm install
cp .env.example .env             # then set SECRET_KEY (see below)
npm run seed                     # creates admin/operator roles + first admin
npm run dev                      # tsx watch on :8000
# frontend (separate shell)
cd frontend && npm install && npm start   # ng serve
```

- `SECRET_KEY` must be >= 32 chars and not a placeholder or the API **refuses to
  start** (`validateConfig()` in `backend/src/config.ts`). Generate with
  `openssl rand -base64 48`.
- No credentials are hardcoded: `backend/.env` (gitignored) holds `SECRET_KEY` and
  `FIRST_ADMIN_EMAIL`/`FIRST_ADMIN_PASSWORD`. `npm run seed` creates the admin only
  when both are set, and skips it otherwise. Never commit real credentials.

## Commands

Backend (`backend/`):
- `npm run dev` — tsx watch. `npm run build` (tsc -> `dist/`) then `npm start`
  (`node dist/server.js`).
- `npm run typecheck` — the only static check; there is no backend lint/format.
- `npm run seed` — idempotent. `npm run smoke` — end-to-end API test that
  **requires a running server on :8000 and seeded DB**, plus
  `SMOKE_ADMIN_EMAIL`/`SMOKE_ADMIN_PASSWORD` (no defaults) for a real admin; it
  creates and cleans up its own data (audit purchase/sale/movement rows are
  intentionally retained).

Frontend (`frontend/`):
- `npm start` (`ng serve`), `npm run build` (prod -> `www/`), `npm run lint`.
- `npm test` runs Vitest under jsdom via `@angular/build:unit-test`. No `*.spec.ts`
  files exist yet. Focus a run with `npm test -- --include='src/**/x.spec.ts'`.
- Environment files: `environment.ts` (dev, `localhost:8000/api`),
  `environment.mobile.ts` (Android build; currently `http://127.0.0.1:8000/api`, its
  comment notes `10.0.2.2` is the emulator's host loopback — adjust to your setup),
  `environment.prod.ts`. Build the mobile variant with
  `ng build --configuration mobile` then `npx cap sync android`.
- Android (`frontend/android/`, Capacitor appId `com.inventario.app`, `webDir: www`):
  `npx cap run android`, or `cd android && ./gradlew assembleDebug|assembleRelease`.
  Artifacts land in `frontend/android/app/build/outputs/` (APK/AAB).

## API conventions (match these exactly)

- Validation uses zod and throws FastAPI-style 422 bodies:
  `{ detail: [{ loc: ["body"|"query"|"path", ...], msg, type }] }`
  (`backend/src/utils/params.ts`).
- Errors: 401 + `WWW-Authenticate: Bearer` for auth, 403 for non-admin on
  `/api/users` & `/api/roles`, 404 for missing rows, 409 for unique/FK violations
  (`middleware/errors.ts` maps any pg code starting `23` to 409).
- Lists return `{ items, total, page, size, pages }`; `size` is capped at 100.
- DB `NUMERIC` values come back as **strings** and are serialized as strings;
  money math is done in integer cents (`utils/money.ts`). Keep prices as strings.
- All stock-affecting operations run inside `withTransaction` and write
  `inventory_movements`; failed stock changes must roll back fully.
- No `/auth/me`: the frontend decodes the JWT `sub` claim
  (`frontend/src/app/core/auth.service.ts`); token stored in localStorage `token`.

## Frontend conventions

- Standalone components only; SCSS; selector prefix `app`; class suffix must be
  `Page` or `Component` (eslint-enforced).
- Pages share list state via `shared/list-state.ts` and HTTP param building via
  `services/http-utils.ts`. UI copy/toasts are in Spanish; identifiers in English.
- `src/test-setup.ts` polyfills `window.matchMedia` for Ionic under jsdom — keep it
  referenced by `angular.json` `test.setupFiles`.
