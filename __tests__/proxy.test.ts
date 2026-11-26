import { describe, it, expect, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { isPublicRoute, ruteoPorHost } from '@/proxy';

const req = (path: string) => new NextRequest(`http://localhost${path}`);

describe('isPublicRoute', () => {
  it('exime las rutas de cron del guard de sesión', () => {
    // Regresión: el matcher del middleware cubre /(api|trpc)(.*), así que sin esta
    // excepción Clerk interceptaba el POST de la scheduled function y devolvía un
    // 307 a /sign-in en lugar de ejecutar el recálculo de triage.
    expect(isPublicRoute(req('/api/cron/triage'))).toBe(true);
  });

  it('exime las pantallas de auth', () => {
    expect(isPublicRoute(req('/sign-in'))).toBe(true);
    expect(isPublicRoute(req('/sign-up'))).toBe(true);
  });

  it('exime el login con la marca de cada club', () => {
    expect(isPublicRoute(req('/c/gimnasia-la-plata/sign-in'))).toBe(true);
    expect(isPublicRoute(req('/c/gimnasia-la-plata/sign-in/factor-one'))).toBe(true);
    expect(isPublicRoute(req('/c/club-prueba/sign-up'))).toBe(true);
    // El resto de /c/<slug> (p. ej. la ruta que elige el club tras el login) exige sesión.
    expect(isPublicRoute(req('/c/club-prueba/entrar'))).toBe(false);
    expect(isPublicRoute(req('/c/club-prueba'))).toBe(false);
  });

  it('exime el logo y los íconos públicos de cada club, y nada más bajo /api/clubes', () => {
    expect(isPublicRoute(req('/api/clubes/gimnasia-la-plata/logo'))).toBe(true);
    expect(isPublicRoute(req('/api/clubes/gimnasia-la-plata/logo?v=abc'))).toBe(true);
    expect(isPublicRoute(req('/api/clubes/gimnasia-la-plata/icono?tam=32'))).toBe(true);
    expect(isPublicRoute(req('/api/clubes/gimnasia-la-plata'))).toBe(false);
    expect(isPublicRoute(req('/api/clubes/a/b/logo'))).toBe(false);
    expect(isPublicRoute(req('/api/club/logo/presign'))).toBe(false);
  });

  it('exime la landing de `/`, solo la ruta exacta', () => {
    expect(isPublicRoute(req('/'))).toBe(true);
    // El "/" exacto no se extiende a las subrutas: siguen detrás del guard.
    expect(isPublicRoute(req('/dashboard'))).toBe(false);
    expect(isPublicRoute(req('/insights'))).toBe(false);
  });

  it('exime robots.txt y sitemap.xml, que piden los crawlers sin sesión', () => {
    expect(isPublicRoute(req('/robots.txt'))).toBe(true);
    expect(isPublicRoute(req('/sitemap.xml'))).toBe(true);
    expect(isPublicRoute(req('/dashboard'))).toBe(false);
    expect(isPublicRoute(req('/otro.xml'))).toBe(false);
  });

  it('exime llms.txt y llms-full.txt, que piden los buscadores con IA sin sesión', () => {
    expect(isPublicRoute(req('/llms.txt'))).toBe(true);
    expect(isPublicRoute(req('/llms-full.txt'))).toBe(true);
    expect(isPublicRoute(req('/llms.txt/x'))).toBe(false);
    expect(isPublicRoute(req('/llms-otro.txt'))).toBe(false);
  });

  it('exime las páginas públicas de funcionalidades, y solo esas', () => {
    expect(isPublicRoute(req('/funcionalidades'))).toBe(true);
    expect(isPublicRoute(req('/funcionalidades/triage-deportivo'))).toBe(true);
    expect(isPublicRoute(req('/funcionalidades/turnos?x=1'))).toBe(true);
    expect(isPublicRoute(req('/funcionalidadesx'))).toBe(false);
    expect(isPublicRoute(req('/funcionalidades-admin'))).toBe(false);
    expect(isPublicRoute(req('/dashboard'))).toBe(false);
  });

  it('mantiene el resto de las rutas protegidas', () => {
    expect(isPublicRoute(req('/dashboard'))).toBe(false);
    expect(isPublicRoute(req('/deportistas'))).toBe(false);
    expect(isPublicRoute(req('/api/deportistas'))).toBe(false);
    expect(isPublicRoute(req('/viandas'))).toBe(false);
  });
});

describe('ruteoPorHost', () => {
  afterEach(() => vi.unstubAllEnvs());

  const enHost = (host: string, path: string, headers: Record<string, string> = {}) =>
    ruteoPorHost(new NextRequest(`http://${host}${path}`, { headers: { host, ...headers } }));

  function seguir(r: ReturnType<typeof ruteoPorHost>) {
    if (r.tipo !== 'seguir') throw new Error(`se esperaba seguir, vino ${r.tipo}`);
    return r;
  }

  it('sin dominio raíz: no hay club en el host y el x-club-slug del cliente se borra', () => {
    const r = seguir(enHost('localhost:3000', '/dashboard', { 'x-club-slug': 'club-ajeno' }));
    expect(r.headers.get('x-club-slug')).toBeNull();
    expect(r.rewrite).toBeNull();
    expect(r.headers.get('x-bt-ruta')).toBe('/dashboard');
  });

  it('en el dominio raíz el x-club-slug del cliente se borra', () => {
    vi.stubEnv('NEXT_PUBLIC_ROOT_DOMAIN', 'bioteam.app');
    const r = seguir(enHost('bioteam.app', '/dashboard', { 'x-club-slug': 'club-ajeno' }));
    expect(r.headers.get('x-club-slug')).toBeNull();
  });

  it('en el subdominio de un club pisa el x-club-slug del cliente con el del host', () => {
    vi.stubEnv('NEXT_PUBLIC_ROOT_DOMAIN', 'bioteam.app');
    const r = seguir(enHost('gimnasia-la-plata.bioteam.app', '/deportistas?q=1', { 'x-club-slug': 'club-ajeno' }));
    expect(r.headers.get('x-club-slug')).toBe('gimnasia-la-plata');
    expect(r.rewrite).toBeNull();
    expect(r.headers.get('x-bt-ruta')).toBe('/deportistas?q=1');
  });

  it('x-bt-ruta tampoco se puede inyectar, y no lleva el _rsc de las requests RSC', () => {
    const r = seguir(enHost('localhost:3000', '/turnos?_rsc=abc&mes=3', { 'x-bt-ruta': 'https://evil.com' }));
    expect(r.headers.get('x-bt-ruta')).toBe('/turnos?mes=3');
  });

  it('en el subdominio, /sign-in* y /sign-up* se reescriben al login del club', () => {
    vi.stubEnv('NEXT_PUBLIC_ROOT_DOMAIN', 'bioteam.app');
    expect(seguir(enHost('club-prueba.bioteam.app', '/sign-in')).rewrite?.pathname).toBe('/c/club-prueba/sign-in');
    expect(seguir(enHost('club-prueba.bioteam.app', '/sign-in/factor-one')).rewrite?.pathname).toBe(
      '/c/club-prueba/sign-in/factor-one',
    );
    const signUp = seguir(enHost('club-prueba.bioteam.app', '/sign-up?__clerk_ticket=tk'));
    expect(signUp.rewrite?.pathname).toBe('/c/club-prueba/sign-up');
    expect(signUp.rewrite?.search).toBe('?__clerk_ticket=tk');
    // Solo esas rutas: /sign-inx no es el login.
    expect(seguir(enHost('club-prueba.bioteam.app', '/sign-inx')).rewrite).toBeNull();
  });

  it('en local, <slug>.localhost con ROOT_DOMAIN=localhost:3000', () => {
    vi.stubEnv('NEXT_PUBLIC_ROOT_DOMAIN', 'localhost:3000');
    const r = seguir(enHost('club-prueba.localhost:3000', '/sign-in'));
    expect(r.headers.get('x-club-slug')).toBe('club-prueba');
    expect(r.rewrite?.pathname).toBe('/c/club-prueba/sign-in');
  });

  it('en el subdominio de un club, /c/<otro>/... manda al subdominio del otro', () => {
    vi.stubEnv('NEXT_PUBLIC_ROOT_DOMAIN', 'bioteam.app');
    expect(enHost('club-prueba.bioteam.app', '/c/gimnasia-la-plata/sign-in?x=1')).toEqual({
      tipo: 'redirect',
      url: 'https://gimnasia-la-plata.bioteam.app/sign-in?x=1',
      status: 307,
    });
    // /c/<el mismo>/entrar (destino del login) sigue de largo.
    expect(seguir(enHost('club-prueba.bioteam.app', '/c/club-prueba/entrar')).rewrite).toBeNull();
  });

  it('en el subdominio de un club, / (la landing de BioTeam) va a /dashboard', () => {
    vi.stubEnv('NEXT_PUBLIC_ROOT_DOMAIN', 'bioteam.app');
    expect(enHost('club-prueba.bioteam.app', '/')).toEqual({
      tipo: 'redirect',
      url: 'http://club-prueba.bioteam.app/dashboard',
      status: 307,
    });
    // En el dominio raíz la landing sigue.
    expect(seguir(enHost('bioteam.app', '/')).rewrite).toBeNull();
  });

  it('el login genérico y las rutas /c/<slug> por path siguen andando en el dominio raíz', () => {
    vi.stubEnv('NEXT_PUBLIC_ROOT_DOMAIN', 'bioteam.app');
    expect(seguir(enHost('bioteam.app', '/sign-in')).rewrite).toBeNull();
    expect(seguir(enHost('bioteam.app', '/c/club-prueba/sign-in')).rewrite).toBeNull();
  });

  it('en el subdominio de un club, /funcionalidades* va con 308 al dominio raíz', () => {
    vi.stubEnv('NEXT_PUBLIC_ROOT_DOMAIN', 'bioteam.app');
    expect(enHost('club-prueba.bioteam.app', '/funcionalidades/turnos?x=1')).toEqual({
      tipo: 'redirect',
      url: 'https://bioteam.app/funcionalidades/turnos?x=1',
      status: 308,
    });
    expect(enHost('club-prueba.bioteam.app', '/funcionalidades')).toEqual({
      tipo: 'redirect',
      url: 'https://bioteam.app/funcionalidades',
      status: 308,
    });
    // /funcionalidadesx no es la sección pública: sigue en el subdominio.
    expect(seguir(enHost('club-prueba.bioteam.app', '/funcionalidadesx')).rewrite).toBeNull();
  });

  it('en el subdominio de un club, /llms.txt y /llms-full.txt van con 308 al dominio raíz', () => {
    vi.stubEnv('NEXT_PUBLIC_ROOT_DOMAIN', 'bioteam.app');
    expect(enHost('club-prueba.bioteam.app', '/llms.txt')).toEqual({
      tipo: 'redirect',
      url: 'https://bioteam.app/llms.txt',
      status: 308,
    });
    expect(enHost('club-prueba.bioteam.app', '/llms-full.txt')).toEqual({
      tipo: 'redirect',
      url: 'https://bioteam.app/llms-full.txt',
      status: 308,
    });
    expect(seguir(enHost('bioteam.app', '/llms.txt')).rewrite).toBeNull();
  });

  it('en local, el 308 de /funcionalidades usa http', () => {
    vi.stubEnv('NEXT_PUBLIC_ROOT_DOMAIN', 'localhost:3000');
    expect(enHost('club-prueba.localhost:3000', '/funcionalidades/insights')).toEqual({
      tipo: 'redirect',
      url: 'http://localhost:3000/funcionalidades/insights',
      status: 308,
    });
  });

  it('en el dominio raíz o sin dominio raíz, /funcionalidades* no redirige', () => {
    expect(seguir(enHost('localhost:3000', '/funcionalidades/turnos')).rewrite).toBeNull();
    vi.stubEnv('NEXT_PUBLIC_ROOT_DOMAIN', 'bioteam.app');
    expect(seguir(enHost('bioteam.app', '/funcionalidades')).rewrite).toBeNull();
    expect(seguir(enHost('bioteam.app', '/funcionalidades/turnos?x=1')).rewrite).toBeNull();
  });
});
