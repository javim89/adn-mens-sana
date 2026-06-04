# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server at localhost:3000
npm run build    # production build
npm run lint     # ESLint
```

No test suite is configured yet.

## Design

See `DESIGN.md` for the full design system: color palette (azul marino `#121A61` + blanco), typography (Oswald para titulares, Inter para cuerpo), tono visual, and component guidelines. All UI work should follow those conventions.

## Stack

- **Next.js 16.2.7** with **App Router** — all layouts and pages are React Server Components by default
- **React 19.2.4**
- **Tailwind CSS v4** — configured via `postcss.config.mjs`; uses `@import "tailwindcss"` (not `@tailwind base/components/utilities`)
- **TypeScript**

## Architecture

All routes live under `app/`. The root layout (`app/layout.tsx`) sets up fonts (Geist Sans + Geist Mono via `next/font/google`) and wraps everything in a flex column body. CSS custom properties for `--background` / `--foreground` are declared in `globals.css` with a dark mode media query, then mapped to Tailwind theme tokens via `@theme inline`.

**Server vs. Client Components:** Components are Server Components unless they declare `'use client'`. Add interactivity (state, event handlers, browser APIs) only in Client Components. Pass data from Server Components to Client Components as props.

**Navigation:** Use `<Link>` from `next/link` (not `<a>`) for client-side navigation with automatic prefetching. For routes that should navigate instantly, export `unstable_instant` from the route file and wrap uncached data in `<Suspense>` — Suspense alone is not sufficient. See `node_modules/next/dist/docs/01-app/02-guides/instant-navigation.md`.

**API Routes:** Create `app/[path]/route.ts` files exporting named HTTP method handlers (`GET`, `POST`, etc.).

**Dynamic routes:** `app/blog/[slug]/page.tsx` → `/blog/:slug`. The `params` prop is a **Promise** in Next.js 16 — always `await params` before reading its properties.
