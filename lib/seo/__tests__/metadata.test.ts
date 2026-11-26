import { describe, it, expect } from 'vitest';
import { METADATA_RAIZ, ROBOTS_INDEX, ROBOTS_NOINDEX } from '../metadata';

describe('METADATA_RAIZ', () => {
  it('tiene metadataBase como URL', () => {
    expect(METADATA_RAIZ.metadataBase).toBeInstanceOf(URL);
  });

  it('es noindex por defecto (falla cerrado)', () => {
    expect(METADATA_RAIZ.robots).toEqual(ROBOTS_NOINDEX);
    expect(ROBOTS_NOINDEX).toMatchObject({ index: false, follow: false, googleBot: { index: false, follow: false } });
  });

  it('no declara openGraph ni twitter, para que ningún segmento los herede', () => {
    expect(METADATA_RAIZ).not.toHaveProperty('openGraph');
    expect(METADATA_RAIZ).not.toHaveProperty('twitter');
  });

  it('es neutra: sin BioTeam', () => {
    const { metadataBase, ...resto } = METADATA_RAIZ;
    expect(metadataBase).toBeDefined();
    expect(JSON.stringify(resto)).not.toMatch(/bioteam/i);
  });

  it('ROBOTS_INDEX indexa y sigue links', () => {
    expect(ROBOTS_INDEX).toEqual({ index: true, follow: true });
  });
});
