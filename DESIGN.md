# DESIGN.md

Guía de diseño de **BioTeam**, plataforma multi-club para la gestión integral del deportista.

---

## Identidad de BioTeam

BioTeam es un producto para clubes: lo usan cuerpos técnicos, áreas médicas y de apoyo para seguir a cada deportista en un solo lugar. No es la marca de ningún club; cada club cliente conserva la suya.

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
- **App icons (`app/`):** `favicon.ico` (16/32/48), `icon.svg` y `apple-icon.png` (180) son un tile cuadrado azul marino con el ícono inverso centrado. Si cambia el logo, regenerarlos desde el SVG inverso con `sharp`.
- **Tono:** profesional, cercano y claro. Copy en español rioplatense con voseo, sin referencias a un club en particular.
- **Escudos de clubes:** solo aparecen donde se habla de los clubes clientes (la franja "Clubes que confían en nosotros" de la landing).

> **Origen:** el primer cliente fue el Club de Gimnasia y Esgrima La Plata; de ahí viene la paleta navy/blanco/dorado, que se mantiene como identidad de BioTeam.

---

## Paleta de Colores

Los colores de BioTeam son el **blanco y azul marino**, con el dorado como acento.

### Colores Primarios

| Nombre        | HEX       | RGB             | Uso principal                          |
|---------------|-----------|-----------------|----------------------------------------|
| Azul marino   | `#121A61` | 18, 26, 97      | Fondos principales, encabezados, CTAs  |
| Blanco        | `#FFFFFF` | 255, 255, 255   | Texto sobre azul, fondos limpios       |

> Referencia Pantone: Azul marino ≈ Pantone 2756 C

### Colores Secundarios

| Nombre         | HEX       | RGB             | Uso                                       |
|----------------|-----------|-----------------|-------------------------------------------|
| Azul medio     | `#1E2A8A` | 30, 42, 138     | Hover states, gradientes                  |
| Azul claro     | `#3346CC` | 51, 70, 204     | Acentos interactivos, links               |
| Gris oscuro    | `#1C1C1C` | 28, 28, 28      | Texto corrido sobre blanco                |
| Gris neutro    | `#6B7280` | 107, 114, 128   | Texto secundario, subtítulos              |
| Gris claro     | `#F3F4F6` | 243, 244, 246   | Fondos de sección alternativa             |

### Color de Acento

| Nombre    | HEX       | RGB             | Uso                                               |
|-----------|-----------|-----------------|---------------------------------------------------|
| Dorado    | `#C9A84C` | 201, 168, 76    | Badges, highlights especiales                     |

El dorado se usa con moderación para jerarquizar contenido destacado.

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

- **CTA primario**: fondo `#121A61`, texto blanco, borde-radius redondeado (`rounded-full` o `rounded-lg`), hover hacia `#1E2A8A`
- **CTA secundario**: borde azul marino, fondo transparente, hover con fondo azul claro muy sutil
- **CTA acento**: fondo dorado `#C9A84C`, texto oscuro — solo para acciones muy puntuales (ej. "Pedí una demo")

### Tarjetas

- Fondo blanco con sombra sutil (`shadow-sm`) o borde `border-gray-100`
- Header de tarjeta con banda azul marino
- Hover con elevación leve (`shadow-md`, `translate-y-[-2px]`)

### Navegación

- Fondo azul marino oscuro
- Ícono + wordmark de BioTeam a la izquierda (variante inversa sobre azul marino, normal sobre fondo claro)
- Links en blanco, active state con subrayado o banda dorada inferior
- Mobile: drawer/hamburger, mismo esquema de colores

### Secciones Hero

- Fondo: foto de alto impacto con overlay azul marino semi-opaco (`bg-[#121A61]/70`)
- O fondo sólido azul marino con textura sutil (ruido, grain)
- Título en blanco, Oswald bold, grande
- Subtítulo en blanco/70

### Insignias y Etiquetas

- Deporte o sección: pastilla con fondo azul claro `#3346CC`, texto blanco, texto pequeño uppercase
- Badge dorado: solo para contextos destacados

---

## Íconos y Assets

- Usar la librería **Lucide React** para íconos de interfaz (compatible con React 19)
- El logo de BioTeam vive en `/public/brand/` (ver "Logo (ícono)" arriba)
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

