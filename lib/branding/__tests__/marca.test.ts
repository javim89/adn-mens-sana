import { describe, it, expect, vi, afterEach } from 'vitest';
import { inicialesDelClub, urlIconoDelClub, urlLoginDelClub, urlLogoDelClub } from '../marca';
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

describe('urlLoginDelClub', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('arma /c/<slug>/sign-in sobre la URL de la app', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.bioteam.test/');
    expect(urlLoginDelClub('gimnasia-la-plata')).toBe('https://app.bioteam.test/c/gimnasia-la-plata/sign-in');
  });

  it('sin URL de la app queda la ruta relativa', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
    expect(urlLoginDelClub('club prueba')).toBe('/c/club%20prueba/sign-in');
  });
});
