# DESIGN.md

Guía de diseño de **BioTeam**, plataforma multi-club para la gestión integral del deportista.

---

## Identidad de BioTeam

BioTeam es un producto para clubes: lo usan cuerpos técnicos, áreas médicas y de apoyo para seguir a cada deportista en un solo lugar. No es la marca de ningún club; cada club cliente conserva la suya.

**Dónde va cada marca:**

| Pantalla | Marca |
|----------|-------|
| Landing (`/`) | BioTeam (ícono, wordmark, íconos de `public/brand/`) |
| Superadmin (`/superadmin`) | BioTeam fija (tokens `bioteam-*`) |
| App logueada (`(app)`) | **La del club**: `MarcaClub` (logo + nombre), sus colores (`TemaClub`), título "`<Sección> · <Club>`" y favicon del club. Nada de "BioTeam". |
| Login del club (`/c/<slug>/sign-in`, `<slug>.<dominio>/sign-in`) | La del club |
| Login genérico (`/sign-in`), `/bienvenida` | Neutra (`TEMA_NEUTRO`, sin logo) |

- **Marca:** ícono + wordmark. El ícono es una "b" minúscula estilizada en diagonal con un punto dorado (`#C9A84C`) en el centro; el wordmark es el texto `BioTeam` en Oswald, bold, `uppercase` (se ve "BIOTEAM"). No usar escudos de clubes como logo del producto.

### Logo (ícono)

| Variante | Archivo | Cuándo |
|----------|---------|--------|
| Normal | `public/brand/bioteam-logo.svg` (+ `.png`) | b azul marino `#121A61` + punto dorado. Fondos claros (blanco, papel de la landing). |
| Inverso | `public/brand/bioteam-logo-inverso.svg` (+ `.png`) | b blanca + punto dorado. Fondos azul marino u oscuros (sidebar, header mobile, auth, footer). |

- **En código:** siempre con `app/components/LogoBioTeam.tsx` (`variante="normal" | "inverso"`). El alto se fija con `className` (`h-7`, `h-9`, `h-12`); el ancho sale solo.
- **Proporción:** no es cuadrado (viewBox 850 × 1111, ~0,77 ancho/alto). No estirarlo ni meterlo en un contenedor cuadrado sin `w-auto`.
- **Lockup:** ícono a la izquierda del wordmark, centrados verticalmente, `gap-2` (wordmark solo) o `gap-3` (wordmark + bajada "Historia Deportiva"). El ícono va un poco más alto que la línea del texto.
- **Accesibilidad:** el ícono es decorativo (`alt=""`, `aria-hidden`) porque siempre acompaña al wordmark, que da el nombre accesible. Si alguna vez va solo, necesita un `aria-label="BioTeam"` en el contenedor.
- **App icons de BioTeam (`public/brand/`):** `favicon.ico` (16/32/48), `icon.svg` y `apple-icon.png` (180) son un tile cuadrado azul marino con el ícono inverso centrado. Si cambia el logo, regenerarlos desde el SVG inverso con `sharp`. Los declaran solo la landing y el superadmin (`lib/branding/iconos-bioteam.ts`).
- **Nunca** poner `icon.*`, `apple-icon.*` ni `favicon.ico` en `app/`: le ganan a la metadata de cada segmento y romperían en silencio el favicon de cada club. El root layout usa `public/brand/icono-neutro.svg`.
- **Tono:** profesional, cercano y claro. Copy en español rioplatense con voseo, sin referencias a un club en particular.
- **Escudos de clubes:** solo aparecen donde se habla de los clubes clientes (la franja "Clubes que confían en nosotros" de la landing).

> **Origen:** el primer cliente fue el Club de Gimnasia y Esgrima La Plata; de ahí viene la paleta navy/blanco/dorado, que se mantiene como identidad de BioTeam.

---

## Paleta de Colores

Cada club elige su **primario**, **secundario** y **acento** en `/configuracion`. La paleta navy/azul/dorado de BioTeam es el **tema default**: la ve la landing, el superadmin y cualquier club que no eligió colores.

### Tema default (BioTeam)

| Rol | HEX | Uso |
|-----|-----|-----|
| Primario | `#121A61` (azul marino) | Sidebar, encabezados, CTAs, fondos de marca |
| Primario hover | `#1E2A8A` | Hover de CTAs, gradientes |
| Primario suave | `#EEF0FB` | Fondos de ítem activo, tintes |
| Secundario | `#3346CC` (azul claro) | Links, acentos interactivos, anillo de foco |
| Acento | `#C9A84C` (dorado) | Badges, highlights. Con moderación |
| Acento suave | `#EADDB5` | Fondos de badge dorado |
| Texto | `#1C1C1C` | Texto corrido |
| Texto secundario | `#6B7280` | Subtítulos, ayudas |
| Gris claro | `#F3F4F6` / `#F9FAFB` | Fondos de sección / filas alternas |
| Borde | `#E5E7EB` | Bordes y divisores |

> Referencia Pantone: azul marino ≈ Pantone 2756 C. Origen: el primer cliente fue Gimnasia y Esgrima La Plata.

### Tokens

Los hex viven **solo** en el bloque `/* tokens:start */ … /* tokens:end */` de `app/globals.css` y en `lib/branding/tokens.ts`. En el resto del código se usan clases de token:

| Clase (Tailwind) | Variable | Personalizable |
|------------------|----------|----------------|
| `primario`, `primario-hover`, `primario-foreground`, `primario-suave` | `--club-primario*` | Sí (el club) |
| `secundario`, `secundario-foreground` | `--club-secundario*` | Sí |
| `acento`, `acento-foreground`, `acento-suave` | `--club-acento*` | Sí |
| `foreground`, `muted`, `muted-foreground`, `subtle`, `border`, `input`, `destructive` | neutros | No |
| `bioteam-navy`, `bioteam-navy-hover`, `bioteam-dorado` | `--bioteam-*` | No (solo superadmin) |
| `--cal-*` | calendario (torneo, receso, recupero, …) | No |

- **Regla:** la app usa `primario` / `secundario` / `acento`. Los nombres de shadcn (`primary`, `secondary`, `accent`, `ring`) quedan **solo** dentro de `app/components/ui/*` (`secondary` es gris; `primary`, `ring` y `accent` son alias del primario/secundario).
- **Hover, texto encima y tintes se derivan solos** (`lib/branding/tema.ts` → `derivarTema`): el club elige 3 colores, no 9.
- **Sin hex sueltos:** `lib/branding/__tests__/sin-hex.test.ts` falla ante cualquier `#hex`, `rgb()` o `hsl()` en `app/` y `lib/` fuera de la allowlist (landing, `tokens.ts`, generated, tests). `globals-css.test.ts` fija que los defaults de `:root` sean iguales a `TEMA_BIOTEAM`.
- **Colores de estado fijos** (triage, asistencia, estado del deportista, calendario): no cambian con el club. En TSX, clases de la paleta Tailwind (`red-100`, `emerald-800`, …); en CSS, `--cal-*`; en gráficos (Recharts), los mapas de `lib/branding/tokens.ts`.

### Política de contraste

- **Primario y secundario** llevan texto blanco encima: tienen que llegar a **4.5:1** contra blanco (WCAG AA, `CONTRASTE_MIN_TEXTO`). `/configuracion` avisa y ofrece "Ajustar automáticamente" (oscurece conservando el tono), y `guardarConfiguracionClub` rechaza un color por debajo.
- **Acento** no tiene mínimo: su texto encima (`acento-foreground`) se elige solo, blanco u oscuro según cuál contrasta más. No usar el acento como color de texto sobre blanco.
- Un club con un color de marca claro (amarillo, celeste) lo usa como **acento**, no como primario.
- Sobre el primario, el texto chico va en `text-white` pleno: el primario (y su hover) garantizan 4.5:1 contra blanco puro, no contra `text-white/NN`.

---

## Tipografía

### Escala de fuentes recomendadas (Google Fonts / next/font)

**Display / Titulares institucionales**
- `Oswald` — condensada, bold, carácter deportivo e histórico
- Peso: 600–700
- Uso: wordmark de BioTeam, secciones hero, grandes titulares

**Encabezados de sección**
- `Barlow` o `DM Sans` — sans-serif moderna y legible
- Peso: 500–700
- Uso: títulos de sección (h2, h3), tarjetas, navegación

**Cuerpo de texto**
- `Inter` — máxima legibilidad en pantalla
- Peso: 400 (regular), 500 (medium)
- Uso: párrafos, descripciones, metadata

**Alternativa monoespaciada** (marcadores, estadísticas)
- `Geist Mono` (ya incluida en el proyecto vía `next/font/google`)

### Escala tipográfica (rem base 16px)

| Token        | Tamaño  | Uso                   |
|--------------|---------|-----------------------|
| `text-xs`    | 0.75rem | Labels, metadata      |
| `text-sm`    | 0.875rem| Texto secundario      |
| `text-base`  | 1rem    | Cuerpo                |
| `text-lg`    | 1.125rem| Subtítulos            |
| `text-2xl`   | 1.5rem  | Títulos de sección    |
| `text-4xl`   | 2.25rem | Titulares principales |
| `text-6xl`   | 3.75rem | Hero / display        |

---

## Tono Visual

### Personalidad
El diseño debe equilibrar dos tensiones:

1. **Solidez profesional** — es una herramienta de trabajo para cuerpos técnicos y áreas médicas. Tiene que transmitir orden, confianza y precisión.
2. **Cercanía deportiva** — habla de deportistas y clubes, no de planillas. Con carácter deportivo, sin volverse genérico.

### Directrices visuales

- **Fotografía**: priorizar fotos reales de deportistas y entrenamientos, sin identificar a un club en particular. No fotos de stock genéricas.
- **Contraste alto**: usar fondos azul marino oscuro con texto blanco para secciones de impacto. Alternar con fondos blancos o gris claro para respirar.
- **Geometría**: líneas horizontales, bandas, estructuras limpias. Evitar ornamentos excesivos.
- **Escudos de clubes clientes**: siempre en su forma original — nunca distorsionados, nunca sobre fondos que los pierdan.
- **Espaciado generoso**: dar espacio a cada pieza de contenido.

---

## Componentes UI — Principios

### Botones

- **CTA primario**: `bg-primario text-white`, borde-radius redondeado (`rounded-full` o `rounded-lg`), `hover:bg-primario-hover`
- **CTA secundario**: `border-primario`, fondo transparente, hover con `bg-primario-suave`
- **CTA acento**: `bg-acento text-acento-foreground` — solo para acciones muy puntuales (ej. "Pedí una demo")
- **Foco**: `focus-visible:ring-2 focus-visible:ring-secundario/40` (o `ring-acento/70` sobre el primario)

### Tarjetas

- Fondo blanco con sombra sutil (`shadow-sm`) o borde `border-border`
- Header de tarjeta con banda `bg-primario`
- Hover con elevación leve (`shadow-md`, `translate-y-[-2px]`)

### Navegación

- Fondo `bg-primario`
- En la app, `MarcaClub` a la izquierda (logo del club en un chip blanco + nombre en Oswald uppercase; sin logo, iniciales). En la landing y el superadmin, ícono + wordmark de BioTeam
- Links en blanco, active state con subrayado o banda `acento` inferior
- Mobile: drawer/hamburger, mismo esquema de colores

### Secciones Hero

- Fondo: foto de alto impacto con overlay semi-opaco (`bg-primario/70`)
- O fondo sólido azul marino con textura sutil (ruido, grain)
- Título en blanco, Oswald bold, grande
- Subtítulo en blanco/70

### Insignias y Etiquetas

- Deporte o sección: pastilla `bg-secundario text-white`, texto pequeño uppercase
- Badge `acento`: solo para contextos destacados

---

## Íconos y Assets

- Usar la librería **Lucide React** para íconos de interfaz (compatible con React 19)
- El logo de BioTeam vive en `/public/brand/` (ver "Logo (ícono)" arriba)
- El logo de cada club lo sube su admin en `/configuracion` (se guarda siempre como PNG en S3) y se sirve en `/api/clubes/<slug>/logo`; el favicon del club, en `/api/clubes/<slug>/icono`
- `/public/logo.png` es el escudo de un club cliente: no usarlo como logo del producto

---

## Responsive

| Breakpoint | Prefijo Tailwind | Dispositivo         |
|------------|------------------|---------------------|
| < 640px    | (base)           | Mobile portrait     |
| ≥ 640px    | `sm:`            | Mobile landscape    |
| ≥ 768px    | `md:`            | Tablet              |
| ≥ 1024px   | `lg:`            | Desktop             |
| ≥ 1280px   | `xl:`            | Wide desktop        |

Mobile-first por defecto. Buena parte del uso (entrenadores en cancha, profesionales en consultorio) llega desde el celular.

---

## Dark Mode

La paleta ya tiene una base de dark mode implícita: el azul marino oscuro como color primario funciona perfectamente como fondo. Si se implementa dark mode:

- Background oscuro: `#0A0F3D` (azul más profundo que el `#121A61`)
- Texto principal: `#F9FAFB`
- Superficies de tarjeta: `#121A61`
- Mantener el blanco puro para los elementos de marca

