import type { Metadata } from 'next';

/**
 * Favicon y app icons de BioTeam (tile azul marino con la "b" inversa). Solo los
 * declaran la landing y el superadmin; viven en `public/brand/` y no en `app/`
 * para que no les ganen a los íconos del club adentro de la app.
 */
export const ICONOS_BIOTEAM: NonNullable<Metadata['icons']> = {
  icon: [
    { url: '/brand/favicon.ico', sizes: 'any' },
    { url: '/brand/icon.svg', type: 'image/svg+xml' },
  ],
  apple: [{ url: '/brand/apple-icon.png', sizes: '180x180', type: 'image/png' }],
};
