const LOCAL = 'http://localhost:3000';

function parsear(valor: string | undefined): URL | null {
  const limpio = (valor ?? '').trim().replace(/\/+$/, '');
  if (!limpio) return null;
  try {
    const url = new URL(limpio);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/**
 * URL pública canónica del sitio (sin `/` final): `NEXT_PUBLIC_APP_URL` → `URL` (el dominio
 * principal de Netlify) → `http://localhost:3000`. Un valor inválido pasa al siguiente
 * fallback en vez de romper el build.
 */
export function urlDelSitio(env: NodeJS.ProcessEnv = process.env): URL {
  return parsear(env.NEXT_PUBLIC_APP_URL) ?? parsear(env.URL) ?? new URL(LOCAL);
}
