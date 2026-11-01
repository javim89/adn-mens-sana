/**
 * Slugs de club: minúsculas, números y guiones simples (`gimnasia-la-plata`).
 * Lo usan el form de alta (sugerencia a partir del nombre) y `crearClub` (validación).
 */

export const SLUG_MIN = 3;
export const SLUG_MAX = 50;
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** "Club Atlético Ñandú" → "club-atletico-nandu". */
export function slugDesdeNombre(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/, '');
}

export function esSlugValido(slug: string): boolean {
  return slug.length >= SLUG_MIN && slug.length <= SLUG_MAX && SLUG_REGEX.test(slug);
}
