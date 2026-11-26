import type { Metadata, Viewport } from 'next';
import { ICONOS_BIOTEAM } from '@/lib/branding/iconos-bioteam';
import { TEMA_BIOTEAM } from '@/lib/branding/tokens';
import { ROBOTS_INDEX } from '@/lib/seo/metadata';

/**
 * Metadata con la marca BioTeam: solo la importan la landing y el superadmin. La
 * imagen OG es estática (`public/brand/`) y no un `opengraph-image.*` en `app/`,
 * que se heredaría a la app y al login de cada club.
 */
export const OG_IMAGEN_BIOTEAM = {
  url: '/brand/og-image.png',
  width: 1200,
  height: 630,
  alt: 'Panel de BioTeam con el triage del plantel, el presentismo semanal y los próximos turnos, bajo el titular «Todo tu club, en una sola pantalla».',
  type: 'image/png',
};

export const TITULO_BIOTEAM = 'BioTeam — Software de gestión para clubes deportivos';
export const DESCRIPCION_BIOTEAM =
  'Software de gestión para clubes deportivos: ficha, seguimientos médicos, turnos, presentismo, viandas y triage de tus deportistas, en una sola plataforma.';

export interface PaginaPublica {
  titulo: string;
  descripcion: string;
  /** Path canónico (`/funcionalidades/turnos`); `metadataBase` lo hace absoluto. */
  ruta: string;
}

/**
 * Metadata de una página pública indexable de BioTeam: título absoluto (sin el template
 * del root), canonical propio, `index` (el root es `noindex`, falla cerrado) y la OG
 * estática de BioTeam.
 */
export function metadataPaginaPublica({ titulo, descripcion, ruta }: PaginaPublica): Metadata {
  return {
    title: { absolute: titulo },
    description: descripcion,
    applicationName: 'BioTeam',
    alternates: { canonical: ruta },
    robots: ROBOTS_INDEX,
    icons: ICONOS_BIOTEAM,
    openGraph: {
      type: 'website',
      siteName: 'BioTeam',
      locale: 'es_AR',
      url: ruta,
      title: titulo,
      description: descripcion,
      images: [OG_IMAGEN_BIOTEAM],
    },
    twitter: {
      card: 'summary_large_image',
      title: titulo,
      description: descripcion,
      images: [OG_IMAGEN_BIOTEAM],
    },
  };
}

export const METADATA_LANDING: Metadata = {
  ...metadataPaginaPublica({ titulo: TITULO_BIOTEAM, descripcion: DESCRIPCION_BIOTEAM, ruta: '/' }),
  keywords: [
    'software de gestión para clubes deportivos',
    'gestión deportiva',
    'clubes',
    'deportistas',
    'seguimiento médico',
    'presentismo',
    'triage',
    'turnos',
    'viandas',
    'software para clubes',
  ],
  authors: [{ name: 'BioTeam' }],
  creator: 'BioTeam',
  publisher: 'BioTeam',
  category: 'sports',
};

export const VIEWPORT_LANDING: Viewport = { themeColor: TEMA_BIOTEAM.primario };
