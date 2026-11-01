# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Agent Routing — MANDATORY

**Every task must be routed through the `software-architect` agent first.**

Before writing any code or making any change, invoke the `software-architect` agent (`.claude/agents/software-architect.md`) to analyze the request, decompose it into sub-tasks, and delegate each one to the appropriate specialist:

- `ux-ui-designer` — visual design, layout, design-system compliance
- `frontend-dev` — React/Next.js components, routing, TypeScript
- `backend-dev` — API routes, Server Actions, data fetching, server-side logic
- `qa-tester` — bug review, accessibility, responsiveness, regression checks

The architect decides which agents to invoke, in what order, and whether tasks can run in parallel. Do not bypass this routing for any task, including small fixes or one-liners.

## Commands

```bash
npm run dev        # start dev server at localhost:3000
npm run build      # production build
npm run lint       # ESLint
npm run test       # Vitest (unit + component tests)
npm run test:e2e   # Playwright (end-to-end tests)
```

## Testing — mandatory

**A task is not complete until its tests pass.** Every feature must ship with tests. No exceptions.

### Stack

- **Vitest** + **@testing-library/react** + **@testing-library/user-event** — unit and component tests
- **Playwright** — end-to-end tests

> The test suite requires an `infra` setup task before the first feature is built. If `vitest` or `playwright` are not yet installed, that setup must happen first.

### Coverage requirements per task type

| Task type | Required tests |
|-----------|---------------|
| `feature` | Component tests + at least one E2E happy-path test |
| `bug` | Regression test that reproduces the bug before the fix |
| `refactor` | Existing tests must continue to pass — no new tests required unless coverage was missing |
| `design` | No test required (visual) |
| `infra` | Smoke test confirming the setup works |

### Definition of Done

A task is **done** when:
1. `npm run lint` passes
2. `npm run build` passes
3. `npm run test` passes (all unit/component tests)
4. `npm run test:e2e` passes for the affected flows
5. The `qa-tester` agent has reviewed and signed off

## Producto

**BioTeam** es una plataforma multi-club para la gestión integral del deportista. Se vende a cualquier club: Gimnasia y Esgrima La Plata es un cliente (el primero), no la marca.

- La marca BioTeam es el ícono (una "b" diagonal con un punto dorado) + el wordmark `BioTeam` (Oswald con `uppercase`, se ve "BIOTEAM"). Aparece **solo en la landing y en el superadmin**.
- El ícono tiene dos variantes en `public/brand/`: `bioteam-logo.svg` (b azul marino, para fondos claros) y `bioteam-logo-inverso.svg` (b blanca, para fondos azul marino/oscuros). Renderizarlo siempre con `app/components/LogoBioTeam.tsx` (`variante="normal" | "inverso"`); es decorativo (`alt=""`) porque va junto al wordmark. No es cuadrado: fijar solo el alto. Detalle en `DESIGN.md` > "Logo (ícono)".
- **Adentro de la app logueada la marca es la del club**: `app/components/branding/MarcaClub.tsx` (logo del club + nombre; sin logo, iniciales), sus colores, título "`<Sección> · <Club>`" y su favicon (`/api/clubes/<slug>/icono`). No escribir "BioTeam" ni copy de un club en particular en la app logueada.
- Favicon y app icons de BioTeam viven en `public/brand/` (`favicon.ico`, `icon.svg`, `apple-icon.png`) y los declaran solo la landing y el superadmin (`lib/branding/iconos-bioteam.ts`). **No agregar `icon.*`, `apple-icon.*` ni `favicon.ico` en `app/`**: le ganan a la metadata de cada segmento y rompen el favicon de cada club.
- El login genérico (`/sign-in`) y `/bienvenida` son neutros (`TEMA_NEUTRO`, sin marca).
- No usar `/public/logo.png` como logo del producto: es el escudo de un club cliente y solo aparece en la franja de clubes de la landing (`app/_landing/clubes.ts`).

## Branding por club

- **Tokens:** los colores de la app son clases de token (`primario`, `secundario`, `acento`, `primario-hover`, `primario-suave`, `muted`, `muted-foreground`, `foreground`, `subtle`, `border`). Los nombres shadcn (`primary`, `secondary`, …) solo dentro de `app/components/ui/*`. Detalle y política de contraste en `DESIGN.md` > "Paleta de Colores".
- **Sin hex:** los hex viven solo en el bloque `tokens:start … tokens:end` de `app/globals.css` y en `lib/branding/tokens.ts`. `lib/branding/__tests__/sin-hex.test.ts` falla ante cualquier `#hex`/`rgb()`/`hsl()` nuevo en `app/` o `lib/`. Colores de estado: paleta Tailwind (`red-100`, …) o los mapas de `tokens.ts`.
- **`TemaClub`** (`app/components/branding/TemaClub.tsx`) inyecta las `--club-*` del club en `:root` con un `<style>` normal (sin `precedence`, para que se retire al cambiar de club). Lo renderizan `(app)/layout.tsx` y el login del club. El admin edita nombre, logo y colores en `/configuracion`.
- **Subdominios:** con `NEXT_PUBLIC_ROOT_DOMAIN`, cada club vive en `<slug>.<dominio>`. `proxy.ts` traduce el host al header interno `x-club-slug` (siempre lo pisa) y reescribe `/sign-in`/`/sign-up` al login del club (`app/c/[slug]/…`). `getContextoClub` valida el slug contra membresía o superadmin. Sin la env, el club sale de la cookie `bt_club` y el login del club es `/c/<slug>/sign-in`. Helpers en `lib/tenant/host.ts`. Pasos de infra en `docs/infra-subdominios.md` (local). Para probar en local: `NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000` y `http://<slug>.localhost:3000` en Chrome.

## Design

See `DESIGN.md` for the full design system: color palette (azul marino `#121A61` + blanco), typography (Oswald para titulares, Inter para cuerpo), tono visual, and component guidelines. All UI work should follow those conventions.

## Stack

- **Next.js 16.2.7** with **App Router** — all layouts and pages are React Server Components by default
- **React 19.2.4**
- **Tailwind CSS v4** — configured via `postcss.config.mjs`; uses `@import "tailwindcss"` (not `@tailwind base/components/utilities`)
- **TypeScript**
- **Clerk** — authentication and user management (`@clerk/nextjs`). Middleware at `middleware.ts` protects routes. Use `auth()` from `@clerk/nextjs/server` in Server Components; `useUser` / `useAuth` hooks in Client Components.
- **Neon** — serverless PostgreSQL database. Connection via `DATABASE_URL` env var (pooled) and `DATABASE_URL_UNPOOLED` for migrations.
- **Prisma** — ORM. Schema at `prisma/schema.prisma`. Client singleton at `lib/db.ts`. Generate types with `npx prisma generate`.

### Correr migraciones (IPv6 — IMPORTANTE)

`npx prisma migrate dev` falla porque la red local usa IPv6 y la conexión TCP directa a Neon no funciona. El flujo correcto es:

1. Agregar los modelos/enums al schema (`prisma/schema.prisma`)
2. Crear el directorio y el SQL manualmente:
   ```
   prisma/migrations/<YYYYMMDDHHMMSS>_<nombre>/migration.sql
   ```
3. Aplicar via HTTP (bypasea TCP):
   ```bash
   node scripts/apply-migration.mjs <nombre-directorio>
   ```
4. Regenerar el cliente:
   ```bash
   npx prisma generate
   ```

El script `scripts/apply-migration.mjs` usa `@neondatabase/serverless` con el driver HTTP para ejecutar el SQL sin TCP.

## Multi-tenant

Cada club ve solo sus datos. Reglas (detalle en `lib/tenant/*`):

- **Datos del club: siempre `getDb()`** (o `dbDelClub(clubId)` con el club explícito, en cron y superadmin) de `@/lib/tenant/db`. Acota cada operación de Prisma al club: filtra lecturas/updates/deletes, inyecta `clubId` en los create y rechaza FKs o `connect` hacia filas de otro club.
- **No importar `@/lib/db`** (cliente base, ve todos los clubes) fuera del allowlist de `eslint.config.mjs` (`lib/tenant/**`, `lib/db-readonly.ts`, `lib/foto-deportista.ts`, `app/api/cron/**`, `lib/actions/superadmin.ts`). ESLint lo marca como error.
- **SQL crudo (`$queryRaw`) no pasa por el cliente acotado:** tiene que filtrar por `club_id = ${db.$clubId()}` (o por el padre, en tablas hijas).
- **Contexto:** `requireContexto(roles)` en páginas, `getContextoClub()` en actions y API routes (`contextoApi` donde corresponda). El rol sale de `Membresia` del club activo, no de Clerk.
- **Modelos nuevos:** clasificarlos en `TENANT_SCOPE` (`lib/tenant/scope.ts`: raíz con `club_id`, hijo por su padre, o global) — el tipo y `scope.test.ts` lo exigen. Si Insights lo tiene que leer, además en `lib/insights/tenant-tablas.json` (o en `excluidas`) y volver a correr `node scripts/setup-insights-rls.mjs`.
- **S3:** fotos en `clubes/<clubId>/deportistas/…` y logos en `clubes/<clubId>/logo.<ext>`; validar con `keyEsDelClub`.
- **Insights, dos capas:** (1) prelude de CTEs acotados con el club en `$1` (`lib/insights/tenant-prelude.ts`), que `compile()` y `runRawSql` anteponen a todo; (2) RLS del rol `insights_ro` resueltas por un token efímero de `insights_sesiones` que el runner setea con `set_config` dentro de la tx read-only. En producción `DATABASE_URL_READONLY` es obligatoria (falla cerrado). El modo SQL crudo es solo para superadmin hasta verificar las RLS en prod. Verificación: `node scripts/check-insights-readonly.mjs`.

### Runbook de release (prod)

1. Snapshot / branch de respaldo de Neon.
2. Migraciones M1–M3 (`20261101000000`–`…02`) con `apply-migration.mjs`. El código viejo sigue andando (default transicional de `club_id`).
3. `node scripts/migrar-membresias.mjs` (probar antes con `--dry-run`) y `node scripts/add-superadmin.mjs <clerkUserId>`.
4. M4 (`20261101000003_equipo_es_propio`) + `node scripts/setup-insights-rls.mjs` + `node scripts/check-insights-readonly.mjs` (tiene que dar todo verde).
5. Deploy. Antes: `DATABASE_URL_READONLY` seteada en Netlify, y la policy IAM del usuario de S3 con `s3:PutObject`/`GetObject`/`DeleteObject` sobre `clubes/*` (además del legacy `deportistas/*`, que se sigue leyendo y borrando).
6. Smoke test: login, Gimnasia ve sus datos con su rol, Insights carga, el selector y `/superadmin/clubes` funcionan.
7. M5 (`20261101000004_club_id_sin_default`): quita el default transicional. Solo con el código nuevo ya en prod.

## Architecture

All routes live under `app/`. The root layout (`app/layout.tsx`) sets up fonts (Geist Sans + Geist Mono via `next/font/google`) and wraps everything in a flex column body. CSS custom properties for `--background` / `--foreground` are declared in `globals.css` with a dark mode media query, then mapped to Tailwind theme tokens via `@theme inline`.

**Server vs. Client Components:** Components are Server Components unless they declare `'use client'`. Add interactivity (state, event handlers, browser APIs) only in Client Components. Pass data from Server Components to Client Components as props.

**Navigation:** Use `<Link>` from `next/link` (not `<a>`) for client-side navigation with automatic prefetching. For routes that should navigate instantly, export `unstable_instant` from the route file and wrap uncached data in `<Suspense>` — Suspense alone is not sufficient. See `node_modules/next/dist/docs/01-app/02-guides/instant-navigation.md`.

**API Routes:** Create `app/[path]/route.ts` files exporting named HTTP method handlers (`GET`, `POST`, etc.).

**Dynamic routes:** `app/blog/[slug]/page.tsx` → `/blog/:slug`. The `params` prop is a **Promise** in Next.js 16 — always `await params` before reading its properties.
