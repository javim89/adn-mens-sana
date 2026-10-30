/**
 * Lo que comparten las pantallas de login (la genérica y la de cada club): la
 * `appearance` de Clerk y las rutas del login de un club.
 */
import { appearanceClerk } from './tema';
import type { Tema } from './tokens';
import { esSlugValido } from '@/lib/utils/slug';
import { urlDelClub } from '@/lib/tenant/host';

/**
 * `appearance` de `<SignIn>` / `<SignUp>`. En el login de un club se oculta el header
 * de Clerk (su logo y "Sign in to <app>"): la marca y el título los pone el layout.
 * En el sign-in se oculta además el link "¿No tenés cuenta? Registrate": las cuentas
 * se crean solo desde una invitación.
 */
export function appearanceLogin(tema: Tema, { pantalla, ocultarHeader }: { pantalla: 'sign-in' | 'sign-up'; ocultarHeader: boolean }) {
  const elements: Record<string, { display: 'none' }> = {};
  if (ocultarHeader) {
    elements.header = { display: 'none' };
    elements.logoBox = { display: 'none' };
  }
  if (pantalla === 'sign-in') elements.footerAction = { display: 'none' };
  return { ...appearanceClerk(tema), elements };
}

/**
 * Ruta de una pantalla del login del club: la interna `/c/<slug>/sign-in`, o
 * `/sign-in` en el subdominio del club (ahí el proxy reescribe a la interna, y el
 * `path` de Clerk tiene que coincidir con la URL que ve el navegador). `entrar`
 * no se reescribe: es siempre la interna.
 */
export function rutaLoginDelClub(
  slug: string,
  pantalla: 'sign-in' | 'sign-up' | 'entrar',
  { enSubdominio = false }: { enSubdominio?: boolean } = {},
): string {
  if (enSubdominio && pantalla !== 'entrar') return `/${pantalla}`;
  return `/c/${encodeURIComponent(slug)}/${pantalla}`;
}

/**
 * El login genérico manda al del último club (cookie `bt_club_slug`) si ese club
 * sigue activo: así el logout y el redirect del proxy a `/sign-in` vuelven a la
 * marca del club. Devuelve el destino (con el query original) o `null`: en el
 * dominio raíz con subdominios, el login del subdominio; si no, `/c/<slug>/...`.
 */
export async function destinoLoginDelClub(
  pantalla: 'sign-in' | 'sign-up',
  slugCookie: string | undefined,
  buscarClub: (slug: string) => Promise<{ slug: string } | null>,
  query: Record<string, string | string[] | undefined> = {},
  { enDominioRaiz = false }: { enDominioRaiz?: boolean } = {},
): Promise<string | null> {
  if (!slugCookie || !esSlugValido(slugCookie)) return null;
  const club = await buscarClub(slugCookie);
  if (!club) return null;
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(query)) {
    for (const v of Array.isArray(valor) ? valor : valor === undefined ? [] : [valor]) params.append(clave, v);
  }
  const qs = params.toString() ? `?${params.toString()}` : '';
  const enSubdominio = enDominioRaiz ? urlDelClub(club.slug, `/${pantalla}${qs}`) : null;
  return enSubdominio ?? `${rutaLoginDelClub(club.slug, pantalla)}${qs}`;
}
