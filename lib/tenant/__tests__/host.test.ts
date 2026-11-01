import { describe, it, expect } from 'vitest';
import {
  dominioCookieCompartida,
  dominioRaiz,
  esDominioRaiz,
  slugDesdeHost,
  urlDelClub,
  urlDelDominioRaiz,
} from '../host';

describe('dominioRaiz', () => {
  it('normaliza la env: minúsculas, sin protocolo, sin barra ni punto final', () => {
    expect(dominioRaiz('BioTeam.app')).toBe('bioteam.app');
    expect(dominioRaiz('https://bioteam.app/')).toBe('bioteam.app');
    expect(dominioRaiz('bioteam.app.')).toBe('bioteam.app');
    expect(dominioRaiz('localhost:3000')).toBe('localhost:3000');
  });

  it('vacía o ausente: null (no hay subdominios)', () => {
    expect(dominioRaiz('')).toBeNull();
    expect(dominioRaiz('  ')).toBeNull();
    expect(dominioRaiz(undefined)).toBeNull();
  });
});

describe('slugDesdeHost', () => {
  const casos: [string | null, string | null, string | null][] = [
    // [host, raíz, slug esperado]
    ['gimnasia-la-plata.bioteam.app', 'bioteam.app', 'gimnasia-la-plata'],
    ['Gimnasia-La-Plata.BioTeam.app', 'bioteam.app', 'gimnasia-la-plata'],
    ['gimnasia-la-plata.bioteam.app:443', 'bioteam.app', 'gimnasia-la-plata'],
    ['gimnasia-la-plata.bioteam.app.', 'bioteam.app', 'gimnasia-la-plata'],
    ['bioteam.app', 'bioteam.app', null],
    ['www.bioteam.app', 'bioteam.app', null],
    ['clerk.bioteam.app', 'bioteam.app', null],
    ['a.b.bioteam.app', 'bioteam.app', null],
    ['evilbioteam.app', 'bioteam.app', null],
    ['club.bioteam.app.evil.com', 'bioteam.app', null],
    ['-raro-.bioteam.app', 'bioteam.app', null],
    ['ab.bioteam.app', 'bioteam.app', null],
    ['localhost:3000', 'bioteam.app', null],
    ['127.0.0.1:3000', 'bioteam.app', null],
    ['deploy-preview-12--bioteam.netlify.app', 'bioteam.app', null],
    ['club-prueba.bioteam.app', null, null],
    [null, 'bioteam.app', null],
    // En local, con ROOT_DOMAIN=localhost:3000.
    ['club-prueba.localhost:3000', 'localhost:3000', 'club-prueba'],
    ['localhost:3000', 'localhost:3000', null],
    ['club-prueba.localhost:4000', 'localhost:3000', null],
    ['club-prueba.localhost', 'localhost', 'club-prueba'],
  ];

  for (const [host, raiz, esperado] of casos) {
    it(`${host} con raíz ${raiz} → ${esperado}`, () => {
      expect(slugDesdeHost(host, raiz)).toBe(esperado);
    });
  }
});

describe('esDominioRaiz', () => {
  it('el raíz y www sí; un subdominio de club, otro dominio o sin raíz, no', () => {
    expect(esDominioRaiz('bioteam.app', 'bioteam.app')).toBe(true);
    expect(esDominioRaiz('www.bioteam.app', 'bioteam.app')).toBe(true);
    expect(esDominioRaiz('club.bioteam.app', 'bioteam.app')).toBe(false);
    expect(esDominioRaiz('x--bioteam.netlify.app', 'bioteam.app')).toBe(false);
    expect(esDominioRaiz('localhost:3000', null)).toBe(false);
    expect(esDominioRaiz('localhost:3000', 'localhost:3000')).toBe(true);
  });
});

describe('urlDelClub', () => {
  it('https en producción, http en local', () => {
    expect(urlDelClub('club-prueba', '/dashboard', 'bioteam.app')).toBe('https://club-prueba.bioteam.app/dashboard');
    expect(urlDelClub('club-prueba', 'sign-in', 'localhost:3000')).toBe('http://club-prueba.localhost:3000/sign-in');
  });

  it('sin raíz, con un slug inválido o reservado: null', () => {
    expect(urlDelClub('club-prueba', '/dashboard', null)).toBeNull();
    expect(urlDelClub('evil.com/x', '/dashboard', 'bioteam.app')).toBeNull();
    expect(urlDelClub('www', '/dashboard', 'bioteam.app')).toBeNull();
  });

  it('el path nunca cambia el host', () => {
    expect(new URL(urlDelClub('club-prueba', '//evil.com/x', 'bioteam.app')!).host).toBe('club-prueba.bioteam.app');
  });
});

describe('urlDelDominioRaiz', () => {
  it('arma la URL del raíz, o null sin raíz', () => {
    expect(urlDelDominioRaiz('/bienvenida', 'bioteam.app')).toBe('https://bioteam.app/bienvenida');
    expect(urlDelDominioRaiz('/bienvenida', null)).toBeNull();
  });
});

describe('dominioCookieCompartida', () => {
  it('el raíz para hosts del raíz o sus subdominios', () => {
    expect(dominioCookieCompartida('club.bioteam.app', 'bioteam.app')).toBe('bioteam.app');
    expect(dominioCookieCompartida('bioteam.app', 'bioteam.app')).toBe('bioteam.app');
  });

  it('nada en otro host (el navegador la rechazaría), en local o sin raíz', () => {
    expect(dominioCookieCompartida('x--bioteam.netlify.app', 'bioteam.app')).toBeUndefined();
    expect(dominioCookieCompartida('club.localhost:3000', 'localhost:3000')).toBeUndefined();
    expect(dominioCookieCompartida('club.bioteam.app', null)).toBeUndefined();
  });
});
