/**
 * Headers de las imágenes públicas del club (`/api/clubes/<slug>/logo|icono`).
 *
 * Con `?v=` igual a la versión actual del tema el cache es immutable de un año: un
 * logo o un color nuevo cambian la versión y, con ella, la URL. Sin `?v=` o con una
 * vieja, 5 minutos.
 */
import { versionTema, type ClubConColores } from './tema';

export const CACHE_INMUTABLE = 'public, max-age=31536000, immutable';
export const CACHE_CORTO = 'public, max-age=300';

export function cacheParaVersion(
  club: ClubConColores & { logoKey?: string | null },
  v: string | null,
): string {
  return v !== null && v === versionTema(club) ? CACHE_INMUTABLE : CACHE_CORTO;
}

/** PNG que nunca se interpreta como otra cosa (nosniff) ni puede cargar nada (CSP). */
export function headersDeImagen(cacheControl: string): Record<string, string> {
  return {
    'Content-Type': 'image/png',
    'Cache-Control': cacheControl,
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'",
  };
}

export function respuestaNoEncontrado(): Response {
  return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
}
