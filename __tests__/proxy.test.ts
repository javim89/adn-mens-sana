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

  it('mantiene el resto de las rutas protegidas', () => {
    expect(isPublicRoute(req('/dashboard'))).toBe(false);
    expect(isPublicRoute(req('/deportistas'))).toBe(false);
    expect(isPublicRoute(req('/api/deportistas'))).toBe(false);
    expect(isPublicRoute(req('/viandas'))).toBe(false);
  });
});
