import { describe, it, expect } from 'vitest';
import { inicialesDelClub, urlIconoDelClub, urlLogoDelClub } from '../marca';
import { versionTema } from '../tema';

describe('inicialesDelClub', () => {
  it.each([
    ['Club de Gimnasia y Esgrima La Plata', 'GE'],
    ['Club Prueba', 'P'],
    ['River Plate', 'RP'],
    ['estudiantes de la plata', 'EP'],
    ['Club Atlético Ñuñoa', 'Ñ'],
    ['Club', 'C'],
    ['  ', '?'],
    ['Club 9 de Julio', '9J'],
  ])('%s → %s', (nombre, esperado) => {
    expect(inicialesDelClub(nombre)).toBe(esperado);
  });
});

describe('URLs de marca', () => {
  const club = { slug: 'club-a', logoKey: 'clubes/a/logo.png', colorPrimario: '#8b0000' };

  it('logo con ?v= de la versión del tema', () => {
    expect(urlLogoDelClub(club)).toBe(`/api/clubes/club-a/logo?v=${versionTema(club)}`);
  });

  it('sin logo: null', () => {
    expect(urlLogoDelClub({ slug: 'club-a', logoKey: null })).toBeNull();
  });

  it('ícono con tamaño y versión', () => {
    expect(urlIconoDelClub(club, 180)).toBe(`/api/clubes/club-a/icono?tam=180&v=${versionTema(club)}`);
  });

  it('el slug va codificado', () => {
    expect(urlIconoDelClub({ slug: 'a b' }, 32)).toMatch(/^\/api\/clubes\/a%20b\/icono/);
  });
});
