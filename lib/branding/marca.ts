/**
 * Marca del club en la app: iniciales (cuando no hay logo) y URLs públicas del logo
 * y los íconos. Funciones puras: se usan en el servidor y en el cliente.
 */
import { versionTema, type ClubConColores } from './tema';

type ClubConMarca = ClubConColores & { slug: string; logoKey?: string | null };

/** Tamaños que sirve `/api/clubes/<slug>/icono`: favicon y apple-touch-icon. */
export const TAMANIOS_ICONO = [32, 180] as const;
export type TamanioIcono = (typeof TAMANIOS_ICONO)[number];

// Palabras que no aportan a las iniciales ("Club de Gimnasia y Esgrima La Plata" → "GE").
const PALABRAS_VACIAS = new Set([
  'club',
  'de',
  'del',
  'la',
  'las',
  'el',
  'los',
  'y',
  'e',
  'a',
  'en',
  'atletico',
  'atlético',
  'deportivo',
  'social',
]);

/** Hasta dos iniciales en mayúscula; sin palabras significativas, la primera letra del nombre. */
export function inicialesDelClub(nombre: string): string {
  const palabras = nombre
    .trim()
    .split(/[\s\-_.]+/)
    .filter((p) => /\p{L}|\p{N}/u.test(p));
  const significativas = palabras.filter((p) => !PALABRAS_VACIAS.has(p.toLowerCase()));
  const fuente = significativas.length > 0 ? significativas : palabras;
  const iniciales = fuente
    .slice(0, 2)
    .map((p) => Array.from(p)[0])
    .join('');
  return iniciales.toLocaleUpperCase('es') || '?';
}

/** URL del logo con `?v=` (cache immutable), o `null` si el club no tiene logo. */
export function urlLogoDelClub(club: ClubConMarca): string | null {
  if (!club.logoKey) return null;
  return `/api/clubes/${encodeURIComponent(club.slug)}/logo?v=${versionTema(club)}`;
}

export function urlIconoDelClub(club: ClubConMarca, tam: TamanioIcono): string {
  return `/api/clubes/${encodeURIComponent(club.slug)}/icono?tam=${tam}&v=${versionTema(club)}`;
}

/**
 * URL de login con la marca del club, para compartir con su gente. Por ahora es la
 * ruta `/c/<slug>/sign-in` del dominio de la app; con subdominios por club pasa a ser
 * `<slug>.<dominio>/sign-in` (se cambia solo acá).
 */
export function urlLoginDelClub(slug: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/+$/, '');
  return `${base}/c/${encodeURIComponent(slug)}/sign-in`;
}
