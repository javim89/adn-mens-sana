/**
 * Subdominio por club: `<slug>.<NEXT_PUBLIC_ROOT_DOMAIN>`.
 *
 * El host solo PROPONE el club: `proxy.ts` lo traduce al header interno
 * `x-club-slug` (pisando cualquier valor que mande el cliente) y `getContextoClub`
 * lo valida contra las membresías del usuario o contra `Superadmin`. El host nunca
 * da acceso por sí solo.
 *
 * Sin `NEXT_PUBLIC_ROOT_DOMAIN` (local, previews de Netlify) no hay subdominios: el
 * club sale de la cookie y el login del club es `/c/<slug>/sign-in`. Para probar
 * en local: `NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000` y `gimnasia-la-plata.localhost:3000`.
 *
 * Funciones puras (el dominio raíz se puede pasar por parámetro): las usan el
 * proxy, el servidor y los tests.
 */

import { esSlugValido } from '@/lib/utils/slug';

/** Header interno con el slug del host. Lo escribe SOLO el proxy. */
export const HEADER_CLUB_SLUG = 'x-club-slug';
/** Header interno con el path + query de la request (para mandar al subdominio). */
export const HEADER_RUTA = 'x-bt-ruta';

/**
 * Subdominios que nunca son un club: los usa la infraestructura (Clerk de producción
 * usa `clerk.` y `accounts.`) o son el propio dominio. `crearClub` los rechaza.
 */
export const SUBDOMINIOS_RESERVADOS: ReadonlySet<string> = new Set([
  'www',
  'app',
  'api',
  'admin',
  'superadmin',
  'clerk',
  'accounts',
  'mail',
  'static',
  'cdn',
]);

/** `NEXT_PUBLIC_ROOT_DOMAIN` normalizado (minúsculas, sin protocolo ni `/`), o `null`. */
export function dominioRaiz(valor: string | undefined = process.env.NEXT_PUBLIC_ROOT_DOMAIN): string | null {
  const limpio = (valor ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\.$/, '');
  return limpio || null;
}

function sinPuerto(host: string): string {
  return host.replace(/:\d+$/, '');
}

/** `localhost`, `*.localhost` o una IP de loopback: se sirve por http. */
function esLocal(host: string): boolean {
  const h = sinPuerto(host);
  return h === 'localhost' || h.endsWith('.localhost') || h === '127.0.0.1' || h === '[::1]';
}

/** El host de la request normalizado, comparable con el dominio raíz. */
function normalizarHost(host: string | null | undefined, raiz: string): string | null {
  if (!host) return null;
  const h = host.trim().toLowerCase().replace(/\.$/, '');
  // El dominio raíz puede traer puerto (`localhost:3000`); si no lo trae, se ignora el del host.
  return /:\d+$/.test(raiz) ? h : sinPuerto(h);
}

/**
 * El slug del club si el host es `<slug>.<raíz>`. `null` para el dominio raíz,
 * `www`, otro dominio (localhost, previews `*.netlify.app`), un subdominio de más de
 * un nivel, uno reservado o un slug inválido.
 */
export function slugDesdeHost(host: string | null | undefined, raiz: string | null = dominioRaiz()): string | null {
  if (!raiz) return null;
  const h = normalizarHost(host, raiz);
  if (!h || h === raiz) return null;
  if (sinPuerto(h).endsWith('.netlify.app') && !sinPuerto(raiz).endsWith('.netlify.app')) return null;
  const sufijo = `.${raiz}`;
  if (!h.endsWith(sufijo)) return null;
  const sub = h.slice(0, -sufijo.length);
  if (sub.includes('.') || SUBDOMINIOS_RESERVADOS.has(sub) || !esSlugValido(sub)) return null;
  return sub;
}

/** El host es el dominio raíz (o `www.`): ahí no hay club, se manda al subdominio. */
export function esDominioRaiz(host: string | null | undefined, raiz: string | null = dominioRaiz()): boolean {
  if (!raiz) return false;
  const h = normalizarHost(host, raiz);
  return h === raiz || h === `www.${raiz}`;
}

function protocolo(raiz: string): 'http' | 'https' {
  return esLocal(raiz) ? 'http' : 'https';
}

function conBarra(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

/** URL absoluta en el subdominio del club, o `null` sin dominio raíz (no hay subdominios). */
export function urlDelClub(slug: string, path: string, raiz: string | null = dominioRaiz()): string | null {
  if (!raiz || !esSlugValido(slug) || SUBDOMINIOS_RESERVADOS.has(slug)) return null;
  return `${protocolo(raiz)}://${slug}.${raiz}${conBarra(path)}`;
}

/** URL absoluta en el dominio raíz, o `null` sin dominio raíz. */
export function urlDelDominioRaiz(path: string, raiz: string | null = dominioRaiz()): string | null {
  if (!raiz) return null;
  return `${protocolo(raiz)}://${raiz}${conBarra(path)}`;
}

/**
 * `Domain` de las cookies que tienen que verse en todos los subdominios (la del
 * último club, para que el login del dominio raíz mande al del club). Solo si el
 * host es el raíz o uno de sus subdominios (si no, el navegador la rechaza) y no es
 * local (los navegadores no aceptan `Domain=localhost`).
 */
export function dominioCookieCompartida(
  host: string | null | undefined,
  raiz: string | null = dominioRaiz(),
): string | undefined {
  if (!raiz || esLocal(raiz)) return undefined;
  const h = normalizarHost(host, raiz);
  if (!h || (h !== raiz && !h.endsWith(`.${raiz}`))) return undefined;
  return sinPuerto(raiz);
}
