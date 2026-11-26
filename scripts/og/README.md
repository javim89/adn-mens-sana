# Imagen Open Graph (`public/brand/og-image.png`)

Pipeline local y one-off. No corre en el build ni en CI. Dirección de arte, copy y prompts: `docs/feature/open-graph/og-art-direction.md`.

Corre en el contenedor `e2e` (trae Chromium para Playwright) con `make up` levantado:

```bash
# 1. Captura la ventana del dashboard de la landing (datos demo) → out/dashboard@2x.png
docker compose run --rm e2e node scripts/og/capturar-dashboard.mjs --url https://bioteam.local

# 2. Fondos con IA (sin texto) → out/fondo-<layout>-<modelo>-*.png
docker compose run --rm e2e node scripts/og/generar-fondo.mjs --layout centrado --n 2
docker compose run --rm e2e node scripts/og/generar-fondo.mjs --layout tres-cuartos --n 2

# 3. Variante 100 % IA (captura + logo de referencia) → out/completo-*.png
docker compose run --rm e2e node scripts/og/generar-completo.mjs --n 2

# 4. Composición local (no se cobra) → out/hibrido-<layout>-<fondo>.png
#    Sin --fondo usa un gradiente CSS con la paleta. --inclinada prueba rotateX(6deg) en el centrado.
#    --sin-bajada omite "La gestión integral del deportista." y rebalancea el espacio (la final va así).
docker compose run --rm e2e node scripts/og/componer.mjs --layout centrado --sin-bajada --fondo scripts/og/out/fondo-centrado-....png

# 5. Exporta el elegido: 1200x630 exacto, sin metadatos, PNG < 300 KB
docker compose run --rm e2e node scripts/og/finalizar.mjs scripts/og/out/hibrido-centrado-....png
```

- **API:** `POST https://openrouter.ai/api/v1/images` (Images API), con `aspect_ratio: "16:9"` y `resolution`. Modelos: `google/gemini-3.1-flash-image` (fondos, 1K, unos USD 0,07 por imagen) y `google/gemini-3-pro-image` (completo, 2K, unos USD 0,14). `--n` tiene un tope de 4 por corrida; cada imagen es una llamada.
- **Key:** `OPEN_ROUTER_API_KEY` se lee solo de esa línea de `.env.local` (o del env). Nunca se imprime, se loguea ni se escribe; los errores muestran solo el status y `error.message`.
- 1 reintento ante 429/5xx, timeout de 120 s. Las generaciones fallidas no se cobran.
- `out/` está en `.gitignore`. La paleta de la plantilla (`PALETA` en `lib.mjs`) tiene que ser la de `TEMA_BIOTEAM`: lo valida `__tests__/lib.test.ts`.
