# design-sync notes — ADN Mens Sana

## How this repo syncs (it's an app, not a package)

- There is no `dist/`. `node .design-sync/build.mjs` (cfg.buildCmd) builds a synthetic package in `.ds-sync/pkg/` (gitignored): a barrel of `app/components/ui/*.tsx`, plus `export * as Icons from 'lucide-react'`, a `.d.ts` tree from `tsc`, the compiled Tailwind CSS, and the fonts. **Re-run it before every converter/driver run**: it's the only way new UI files, prop changes or new utility classes reach the bundle.
- Run order: `node .design-sync/build.mjs`, then `node .ds-sync/resync.mjs --config .design-sync/config.json --node-modules ./node_modules --out ./ds-bundle [--remote .design-sync/.cache/remote-sync.json]`. There's no `--entry` flag; `cfg.entry` points at `.ds-sync/pkg/index.ts`.
- `cfg.entry`, `cssEntry`, `extraFonts`, `srcDir` and `tsconfig` are relative to `.ds-sync/pkg/` (the converter treats it as the package dir).
- CSS: `.design-sync/ds.css` imports the real `app/globals.css` (tokens stay single-sourced) and `@source`s `app/`, `lib/` and `.design-sync/previews/`. The result is a **precompiled** sheet: the design agent only gets utilities the app or previews already use. The conventions header says so explicitly. If designs need more vocabulary, add `@source inline("…")` lines to `ds.css`.
- `globals.css` also carries the FullCalendar and react-grid-layout overrides. They're harmless in designs and kept for fidelity.
- Fonts: next/font injects Inter/Oswald at runtime in the app, so nothing static exists to scrape. `.design-sync/fonts/` holds self-hosted woff2 files (latin + latin-ext, SIL OFL) downloaded from Google Fonts. To regenerate them, fetch `fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Oswald:wght@400;600;700` with a Chrome UA, keep the latin/latin-ext blocks, and rewrite the URLs to `./<family>-<subset>.woff2`. `ds.css` defines `--font-inter`/`--font-oswald` (next/font's variable names) so classes like `font-[family-name:var(--font-oswald)]` resolve.
- `Icons` is excluded from cards (`componentSrcMap: {Icons: null}`) but ships on the global.
- Groups come from `docsMap` → `.design-sync/groups/<Group>.md` category stubs (one stub per family, shared by every member). A new UI export needs a `docsMap` entry, or it lands in `general`.
- shadcn sub-parts (`DialogContent`, `SelectItem`…) have no namespace compound, so the converter treats each as its own component. That's intentional: each keeps its own `.d.ts`. Their previews re-export shared compositions from `.design-sync/previews/_lib/compositions.tsx`.

## Previews

- Every one of the 56 components has an authored preview. Overlays use `cardMode: single` (Dialog*, CommandDialog, Select*, DropdownMenu*, Popover*). Tabs* use `column`.
- `CustomSelect` Open/Searchable states: the menu is internal state, so the preview clicks the trigger once on mount (`useEffect`). That's a harness trick, not app code.
- `SelectScrollUp/DownButton`: `LongSelect` opens on a late item ("Infantiles") so both scroll arrows render.
- Avatar `WithPhoto` uses an inline SVG data URI because captures run offline.
- Input `Types`: the file input shows Chromium's English "Choose File" chrome. Expected.
- Grading of sub-part cards: cells that were pixel-identical (PIL diff) to an already-reviewed root cell of the same composition were graded from that review.

## Known render warns

- none (validate is clean after the cardMode overrides)

## Re-sync risks

- **Avatar** (`app/components/ui/avatar.tsx`) was synced from `feature/add-profile-picture`. A sync run from a branch without it builds 55 components (the build prints `stale preview: Avatar`), and its upload would delete the Avatar card from the project. Sync from a branch that includes Avatar.

- **`_lib/compositions.tsx` is shared.** Editing it changes ~40 cards, but grade keys may only track each component's own `.tsx`. After touching it, re-capture with `--force` (or `--components` covering every importer) and regrade.
- **Precompiled CSS drift:** a utility that's removed from the app disappears from the design vocabulary on the next sync. Re-validate the class table in `conventions.md` (grep `_ds_bundle.css`) every re-sync.
- **Fonts were network-fetched once** (2026-10-19) and are committed. Google may change files, but the committed copies stay stable.
- **Bundle size is ~1.9 MB, mostly the full lucide set.** If that's a problem, swap `export * as Icons` for a curated list in `build.mjs`.
- `build.mjs` relies on the repo's `tsc`, `postcss` and `@tailwindcss/postcss` being installed (`npm ci`), plus the Tailwind v4 `@source` and `base` options.
