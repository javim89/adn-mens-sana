# DESIGN.md

Guía de diseño para el proyecto digital del Club de Gimnasia y Esgrima La Plata.

---

## Identidad del Club

**Fundación:** 3 de junio de 1887 — el club de fútbol más antiguo que aún participa en el fútbol argentino de primera división.
**Apodos:** El Lobo, Los Triperos
**Lema:** "Primeros en América"
**Estadio:** Juan Carmelo Zerillo (El Bosque), inaugurado en 1924, capacidad ~24.500 espectadores
**Raíces:** El apodo "Triperos" viene de los trabajadores de los frigoríficos de Berisso que apoyaban al club desde sus inicios. El grito de aliento es "¡Tripa corazón!". El apodo "Lobo" surgió en los años '60, inspirado en su ubicación dentro del Bosque platense (referencia al lobo del cuento "Caperucita Roja").

El club no es solo un equipo de fútbol: opera secciones de más de 20 deportes, instituciones educativas (jardín, primaria y secundaria), y programas de deporte inclusivo (TIADE).

---

## Paleta de Colores

Los colores institucionales son el **blanco y azul marino** (albiazul), establecidos en 1910 con la camiseta blanca y la banda horizontal azul sobre el pecho.

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
| Dorado    | `#C9A84C` | 201, 168, 76    | Detalles del escudo, badges, highlights especiales|

El dorado surge de los elementos heráldicos del escudo (laureles, casco), y puede usarse con moderación para jerarquizar contenido premium o histórico.

---

## Tipografía

### Escala de fuentes recomendadas (Google Fonts / next/font)

**Display / Titulares institucionales**
- `Oswald` — condensada, bold, carácter deportivo e histórico
- Peso: 600–700
- Uso: nombre del club, secciones hero, grandes titulares

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
El diseño debe equilibrar dos tensiones propias del club:

1. **Historia y orgullo** — 139 años, el más antiguo, "Primeros en América". El diseño no debe ser genérico; debe sentirse con peso y tradición.
2. **Comunidad y cercanía** — Triperos, trabajadores, familias de La Plata. No es un club elitista; es popular, apasionado y de barrio.

### Directrices visuales

- **Fotografía**: priorizar fotos de alta emoción — gente en las tribunas, el bosque al fondo, jugadores en acción, familias en el polideportivo. No fotos de stock.
- **Contraste alto**: usar fondos azul marino oscuro con texto blanco para secciones de impacto. Alternar con fondos blancos o gris claro para respirar.
- **Geometría**: la camiseta tradicional define la estética — líneas horizontales, bandas, estructuras limpias. Evitar ornamentos excesivos.
- **Escudo**: el escudo oficial (diseñado en 1928 por Raúl Felices) siempre en su forma original — nunca distorsionado, nunca sobre fondos que lo pierdan.
- **Espaciado generoso**: el club tiene historia para mostrar; dar espacio a cada pieza de contenido.

---

## Componentes UI — Principios

### Botones

- **CTA primario**: fondo `#121A61`, texto blanco, borde-radius redondeado (`rounded-full` o `rounded-lg`), hover hacia `#1E2A8A`
- **CTA secundario**: borde azul marino, fondo transparente, hover con fondo azul claro muy sutil
- **CTA acento**: fondo dorado `#C9A84C`, texto oscuro — solo para acciones muy puntuales (ej. "Hacete Socio")

### Tarjetas

- Fondo blanco con sombra sutil (`shadow-sm`) o borde `border-gray-100`
- Header de tarjeta con banda azul marino (referencia visual a la camiseta)
- Hover con elevación leve (`shadow-md`, `translate-y-[-2px]`)

### Navegación

- Fondo azul marino oscuro
- Logo del club a la izquierda
- Links en blanco, active state con subrayado o banda dorada inferior
- Mobile: drawer/hamburger, mismo esquema de colores

### Secciones Hero

- Fondo: foto de alto impacto con overlay azul marino semi-opaco (`bg-[#121A61]/70`)
- O fondo sólido azul marino con textura sutil (ruido, grain)
- Título en blanco, Oswald bold, grande
- Subtítulo en blanco/70

### Insignias y Etiquetas

- Deporte o sección: pastilla con fondo azul claro `#3346CC`, texto blanco, texto pequeño uppercase
- "Primeros en América": badge dorado especial para contextos institucionales

---

## Íconos y Assets

- Usar la librería **Lucide React** para íconos de interfaz (compatible con React 19)
- El escudo oficial del club debe estar disponible como SVG en `/public/shield.svg`
- La camiseta histórica (blanca con banda azul horizontal) es un motivo gráfico válido para usar como elemento decorativo en secciones especiales

---

## Responsive

| Breakpoint | Prefijo Tailwind | Dispositivo         |
|------------|------------------|---------------------|
| < 640px    | (base)           | Mobile portrait     |
| ≥ 640px    | `sm:`            | Mobile landscape    |
| ≥ 768px    | `md:`            | Tablet              |
| ≥ 1024px   | `lg:`            | Desktop             |
| ≥ 1280px   | `xl:`            | Wide desktop        |

Mobile-first por defecto. La mayor parte del tráfico de fans de fútbol argentino llega desde dispositivos móviles.

---

## Dark Mode

El club ya tiene una base de dark mode implícita en su paleta: el azul marino oscuro como color primario funciona perfectamente como fondo. Si se implementa dark mode:

- Background oscuro: `#0A0F3D` (azul más profundo que el `#121A61`)
- Texto principal: `#F9FAFB`
- Superficies de tarjeta: `#121A61`
- Mantener el blanco puro para los elementos que simulan la camiseta

---

## Referencias

- [Sitio oficial del club](https://www.gimnasia.org.ar/)
- [Wikipedia — Club de Gimnasia y Esgrima La Plata](https://en.wikipedia.org/wiki/Club_de_Gimnasia_y_Esgrima_La_Plata)
- [Brand Color Codes](https://www.brandcolorcode.com/gimnasia-y-esgrima-lp)
