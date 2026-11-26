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

const TITULO = 'BioTeam — Todo tu club, en una sola pantalla';
const DESCRIPCION =
  'Ficha, seguimientos médicos, psicológicos y sociales, turnos, presentismo, viandas y triage de los deportistas de tu club, todo en una sola plataforma.';

export const METADATA_LANDING: Metadata = {
  title: { absolute: TITULO },
  description: DESCRIPCION,
  applicationName: 'BioTeam',
  keywords: [
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
  alternates: { canonical: '/' },
  robots: ROBOTS_INDEX,
  icons: ICONOS_BIOTEAM,
  openGraph: {
    type: 'website',
    siteName: 'BioTeam',
    locale: 'es_AR',
    url: '/',
    title: TITULO,
    description: DESCRIPCION,
    images: [OG_IMAGEN_BIOTEAM],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITULO,
    description: DESCRIPCION,
    images: [OG_IMAGEN_BIOTEAM],
  },
};

export const VIEWPORT_LANDING: Viewport = { themeColor: TEMA_BIOTEAM.primario };
