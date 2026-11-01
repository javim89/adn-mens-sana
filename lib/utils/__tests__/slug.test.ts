import { describe, test, expect } from 'vitest';
import { esSlugValido, slugDesdeNombre, SLUG_MAX } from '../slug';

describe('slugDesdeNombre', () => {
  test.each([
    ['Club de Gimnasia y Esgrima La Plata', 'club-de-gimnasia-y-esgrima-la-plata'],
    ['Club Atlético Ñandú', 'club-atletico-nandu'],
    ['  River   Plate!! ', 'river-plate'],
    ['A.F.A. 2026', 'a-f-a-2026'],
  ])('"%s" → "%s"', (nombre, slug) => {
    expect(slugDesdeNombre(nombre)).toBe(slug);
  });

  test('se corta al máximo sin dejar un guion al final', () => {
    const slug = slugDesdeNombre(`${'a'.repeat(SLUG_MAX - 1)} bcd`);
    expect(slug.length).toBeLessThanOrEqual(SLUG_MAX);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('esSlugValido', () => {
  test.each(['club-prueba', 'abc', 'club2026'])('"%s" es válido', (slug) => {
    expect(esSlugValido(slug)).toBe(true);
  });

  test.each(['ab', 'Club', 'club--x', '-club', 'club-', 'club_x', 'a'.repeat(SLUG_MAX + 1)])(
    '"%s" no es válido',
    (slug) => {
      expect(esSlugValido(slug)).toBe(false);
    },
  );
});
