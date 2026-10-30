import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { isPublicRoute } from '@/proxy';

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

  it('mantiene el resto de las rutas protegidas', () => {
    expect(isPublicRoute(req('/dashboard'))).toBe(false);
    expect(isPublicRoute(req('/deportistas'))).toBe(false);
    expect(isPublicRoute(req('/api/deportistas'))).toBe(false);
    expect(isPublicRoute(req('/viandas'))).toBe(false);
  });
});
