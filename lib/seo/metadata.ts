import type { Metadata } from 'next';
import { urlDelSitio } from '@/lib/seo/sitio';

export const ROBOTS_NOINDEX: Metadata['robots'] = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
};

export const ROBOTS_INDEX: Metadata['robots'] = { index: true, follow: true };

/**
 * Metadata neutra del root: la heredan las pantallas sin marca (login genérico,
 * /bienvenida) y la app. Falla cerrado: `noindex` salvo que el segmento (solo la
 * landing) lo pise. No tiene `openGraph` ni `twitter` para que ningún segmento
 * herede la preview de BioTeam: Next combina la metadata de forma shallow.
 */
export const METADATA_RAIZ: Metadata = {
  metadataBase: urlDelSitio(),
  title: 'Gestión integral del deportista',
  description: 'Gestión integral del deportista para clubes',
  icons: { icon: [{ url: '/brand/icono-neutro.svg', type: 'image/svg+xml' }] },
  robots: ROBOTS_NOINDEX,
  formatDetection: { telephone: false },
};
