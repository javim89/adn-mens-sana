# BioTeam — conventions for building with this kit

BioTeam, a multi-club athlete-management platform (sports, medical and psychological follow-up of players). UI copy is **Spanish (Argentina, voseo)**: "Guardar cambios", "Elegí una categoría", "Buscar deportista…".

## Setup

- Components live on `window.BioTeam` (shadcn/ui on Radix + Tailwind v4). No provider or wrapper is needed: Radix overlays (Dialog, Select, Popover, DropdownMenu) portal to `document.body` themselves.
- Icons: the whole lucide set is at `BioTeam.Icons` (`<Icons.Search />`, `<Icons.UserPlus />`). Inside `Button` and `CommandItem`, icons are auto-sized to 16px. Elsewhere, size them with `className="size-4"`.
- Fonts: **Inter** for body text (the default on `body`) and **Oswald** for display headings and big numbers: `font-[family-name:var(--font-oswald)]`.

## Styling: precompiled Tailwind, so use only classes that exist

`styles.css` → `_ds_bundle.css` is a **precompiled** Tailwind v4 sheet. It contains only the utilities the real app uses. A class that isn't in it does nothing. Before reaching for an unusual utility, grep `_ds_bundle.css`. For anything missing, use an inline `style={{…}}`.

| Purpose | Classes that exist |
|---|---|
| Semantic tokens | `bg-primary` `text-primary-foreground` `bg-secondary` `bg-muted` `text-muted-foreground` `bg-accent` `bg-destructive` `text-destructive` `bg-card` `bg-background` `text-foreground` `border-input` |
| Club palette (arbitrary hex, as the app writes it) | navy `bg-[#121A61]` `text-[#121A61]` `border-[#121A61]` · hover navy `hover:bg-[#1E2A8A]` · accent blue `text-[#3346CC]` `bg-[#3346CC]` · gold `bg-[#C9A84C]` `text-[#C9A84C]` `border-[#C9A84C]` · text `text-[#1C1C1C]` · muted `text-[#6B7280]` · page bg `bg-[#F3F4F6]` · soft navy pill `bg-[#EEF0FB]` |
| Status (triage Verde/Amarillo/Naranja/Rojo) | `bg-green-100 text-green-800` · `bg-yellow-100` · `bg-orange-100` · `bg-red-100 text-red-800` |
| Surfaces & layout | `bg-white` `rounded-lg` `rounded-xl` `shadow-sm` `border-gray-100` `border-gray-200` `divide-gray-100` `max-w-7xl` `min-h-screen` `space-y-6` `gap-4` `gap-6` `p-4` `p-6` `grid-cols-2` `grid-cols-3` `sm:grid-cols-2` `lg:grid-cols-3` `lg:grid-cols-4` |
| Type | `text-xs` `text-sm` `text-2xl` `text-3xl` `font-bold` `uppercase` `tracking-wide` |

CSS variables also work in inline styles: `var(--primary)` (#121A61), `var(--accent)` (#3346CC), `var(--club-gold)` (#C9A84C), `var(--muted-foreground)`, `var(--border)`, `var(--radius)`. Gold is a sparing accent for highlights and historic content, never a primary action color. Primary actions are navy (`Button` default).

## Where the truth lives

- `styles.css` and its imports (`_ds_bundle.css` holds the tokens in `:root` and every compiled utility; `fonts/fonts.css`).
- Per-component API and usage: `components/<group>/<Name>/<Name>.d.ts` and `<Name>.prompt.md`. Sub-parts are separate exports (`DialogContent`, `SelectItem`, `CardHeader`…) and are always composed inside their parent.
- `CustomSelect` is a self-contained controlled select (`value`, `onChange`, `options: {value,label}[]`, `searchable`). `Select` is the Radix compound version.

## Example

```jsx
const { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button, Icons } = window.BioTeam;

<div className="min-h-screen bg-[#F3F4F6] p-6 space-y-6">
  <div className="flex items-center justify-between">
    <h1 className="text-3xl font-bold text-[#121A61] font-[family-name:var(--font-oswald)]">Deportistas</h1>
    <Button><Icons.UserPlus /> Nuevo deportista</Button>
  </div>
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-2">
        <CardTitle className="text-base text-[#121A61]">García, Juan</CardTitle>
        <Badge className="border-transparent bg-green-100 text-green-800">Verde</Badge>
      </CardHeader>
      <CardContent className="p-4 pt-2 text-sm text-muted-foreground">Reserva · Mediocampista</CardContent>
    </Card>
  </div>
</div>
```
