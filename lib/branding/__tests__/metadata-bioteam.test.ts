import { describe, it, expect } from 'vitest';
import { METADATA_LANDING, OG_IMAGEN_BIOTEAM, VIEWPORT_LANDING, metadataPaginaPublica } from '../metadata-bioteam';
import { ICONOS_BIOTEAM } from '../iconos-bioteam';
import { TEMA_BIOTEAM } from '../tokens';

const og = METADATA_LANDING.openGraph as Record<string, unknown>;
const twitter = METADATA_LANDING.twitter as Record<string, unknown>;

describe('METADATA_LANDING', () => {
  it('title absoluto con la marca y la keyword principal', () => {
    expect(METADATA_LANDING.title).toEqual({ absolute: 'BioTeam — Software de gestión para clubes deportivos' });
  });

  it('description de 160 caracteres como máximo, con la keyword', () => {
    expect(typeof METADATA_LANDING.description).toBe('string');
    expect((METADATA_LANDING.description as string).length).toBeLessThanOrEqual(160);
    expect(METADATA_LANDING.description).toMatch(/software de gestión para clubes deportivos/i);
  });

  it('conserva keywords, autor y categoría', () => {
    expect(METADATA_LANDING.keywords).toContain('software de gestión para clubes deportivos');
    expect(METADATA_LANDING).toMatchObject({ creator: 'BioTeam', publisher: 'BioTeam', category: 'sports' });
  });

  it('Open Graph de BioTeam completo', () => {
    expect(og).toMatchObject({
      type: 'website',
      siteName: 'BioTeam',
      locale: 'es_AR',
      url: '/',
      title: 'BioTeam — Software de gestión para clubes deportivos',
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

describe('metadataPaginaPublica', () => {
  const m = metadataPaginaPublica({
    titulo: 'Turnos para clubes | BioTeam',
    descripcion: 'Agenda de turnos por profesional.',
    ruta: '/funcionalidades/turnos',
  });

  it('title absoluto y description', () => {
    expect(m.title).toEqual({ absolute: 'Turnos para clubes | BioTeam' });
    expect(m.description).toBe('Agenda de turnos por profesional.');
    expect(m.applicationName).toBe('BioTeam');
  });

  it('canonical propio e index (el root es noindex)', () => {
    expect(m.alternates?.canonical).toBe('/funcionalidades/turnos');
    expect(m.robots).toEqual({ index: true, follow: true });
  });

  it('OG y twitter con la imagen estática de BioTeam y la URL de la página', () => {
    expect(m.openGraph).toMatchObject({
      type: 'website',
      siteName: 'BioTeam',
      locale: 'es_AR',
      url: '/funcionalidades/turnos',
      title: 'Turnos para clubes | BioTeam',
      description: 'Agenda de turnos por profesional.',
      images: [OG_IMAGEN_BIOTEAM],
    });
    expect(m.twitter).toMatchObject({
      card: 'summary_large_image',
      title: 'Turnos para clubes | BioTeam',
      description: 'Agenda de turnos por profesional.',
      images: [OG_IMAGEN_BIOTEAM],
    });
  });

  it('usa los íconos de BioTeam', () => {
    expect(m.icons).toBe(ICONOS_BIOTEAM);
  });
});

describe('VIEWPORT_LANDING', () => {
  it('themeColor sale del tema de BioTeam', () => {
    expect(VIEWPORT_LANDING.themeColor).toBe(TEMA_BIOTEAM.primario);
  });
});
