import { describe, it, expect } from 'vitest';
import { METADATA_LANDING, OG_IMAGEN_BIOTEAM, VIEWPORT_LANDING } from '../metadata-bioteam';
import { ICONOS_BIOTEAM } from '../iconos-bioteam';
import { TEMA_BIOTEAM } from '../tokens';

const og = METADATA_LANDING.openGraph as Record<string, unknown>;
const twitter = METADATA_LANDING.twitter as Record<string, unknown>;

describe('METADATA_LANDING', () => {
  it('title absoluto con la marca y el titular aprobado', () => {
    expect(METADATA_LANDING.title).toEqual({ absolute: 'BioTeam — Todo tu club, en una sola pantalla' });
  });

  it('description de 160 caracteres como máximo', () => {
    expect(typeof METADATA_LANDING.description).toBe('string');
    expect((METADATA_LANDING.description as string).length).toBeLessThanOrEqual(160);
  });

  it('Open Graph de BioTeam completo', () => {
    expect(og).toMatchObject({
      type: 'website',
      siteName: 'BioTeam',
      locale: 'es_AR',
      url: '/',
      title: 'BioTeam — Todo tu club, en una sola pantalla',
      description: METADATA_LANDING.description,
    });
    expect(og.images).toEqual([OG_IMAGEN_BIOTEAM]);
  });

  it('la imagen OG es la estática de 1200x630 con alt', () => {
    expect(OG_IMAGEN_BIOTEAM).toMatchObject({ url: '/brand/og-image.png', width: 1200, height: 630, type: 'image/png' });
    expect(OG_IMAGEN_BIOTEAM.alt.trim()).not.toBe('');
  });

  it('twitter summary_large_image, sin handle', () => {
    expect(twitter.card).toBe('summary_large_image');
    expect(twitter.images).toEqual([OG_IMAGEN_BIOTEAM]);
    expect(twitter).not.toHaveProperty('site');
  });

  it('se indexa y tiene canonical /', () => {
    expect(METADATA_LANDING.robots).toMatchObject({ index: true, follow: true });
    expect(METADATA_LANDING.alternates?.canonical).toBe('/');
  });

  it('usa los íconos de BioTeam', () => {
    expect(METADATA_LANDING.icons).toBe(ICONOS_BIOTEAM);
  });
});

describe('VIEWPORT_LANDING', () => {
  it('themeColor sale del tema de BioTeam', () => {
    expect(VIEWPORT_LANDING.themeColor).toBe(TEMA_BIOTEAM.primario);
  });
});
