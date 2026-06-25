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

## Architecture

All routes live under `app/`. The root layout (`app/layout.tsx`) sets up fonts (Geist Sans + Geist Mono via `next/font/google`) and wraps everything in a flex column body. CSS custom properties for `--background` / `--foreground` are declared in `globals.css` with a dark mode media query, then mapped to Tailwind theme tokens via `@theme inline`.

**Server vs. Client Components:** Components are Server Components unless they declare `'use client'`. Add interactivity (state, event handlers, browser APIs) only in Client Components. Pass data from Server Components to Client Components as props.

**Navigation:** Use `<Link>` from `next/link` (not `<a>`) for client-side navigation with automatic prefetching. For routes that should navigate instantly, export `unstable_instant` from the route file and wrap uncached data in `<Suspense>` — Suspense alone is not sufficient. See `node_modules/next/dist/docs/01-app/02-guides/instant-navigation.md`.

**API Routes:** Create `app/[path]/route.ts` files exporting named HTTP method handlers (`GET`, `POST`, etc.).

**Dynamic routes:** `app/blog/[slug]/page.tsx` → `/blog/:slug`. The `params` prop is a **Promise** in Next.js 16 — always `await params` before reading its properties.
