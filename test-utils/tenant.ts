/**
 * Helpers para testear código que usa la capa multi-tenant (`lib/tenant`).
 *
 * Uso típico en un test de una action o una query:
 *
 *   const { mockDb } = vi.hoisted(() => ({ mockDb: { deportista: { findMany: vi.fn() } } }));
 *   vi.mock('@/lib/tenant/db', async () =>
 *     (await import('@/test-utils/tenant')).moduloDbMock(mockDb));
 *   vi.mock('@/lib/tenant/contexto', async () =>
 *     (await import('@/test-utils/tenant')).moduloContextoMock());
 *
 * y en cada test, `setContexto(mockContexto('entrenador'))` o `setContexto(null)`.
 * Los factories se importan dentro de `vi.mock` porque este se hoistea por encima
 * de los imports del archivo.
 */

import { vi } from 'vitest';
import type { AppRole } from '@/lib/generated/prisma/client';
import type { ContextoClub } from '@/lib/tenant/contexto';

export const CLUB_TEST = {
  id: 'club_test',
  nombre: 'Club de prueba',
  slug: 'club-de-prueba',
  logoKey: null,
  logoUrl: null,
  colorPrimario: null,
  colorSecundario: null,
} satisfies ContextoClub['club'];

/** Un contexto válido con el rol pedido. */
export function mockContexto(rol: AppRole = 'admin', overrides: Partial<ContextoClub> = {}): ContextoClub {
  const club = overrides.club ?? CLUB_TEST;
  return {
    userId: 'user_test',
    clubId: club.id,
    rol,
    lugarRetiro: null,
    club,
    esSuperadmin: false,
    comoSuperadmin: false,
    ...overrides,
  };
}

let contextoActual: ContextoClub | null = mockContexto();

/** Cambia el contexto que devuelve el mock de `@/lib/tenant/contexto`. */
export function setContexto(contexto: ContextoClub | null): void {
  contextoActual = contexto;
}

function errorJsonApi(status: number, code: string): Response {
  return new Response(JSON.stringify({ errors: [{ status: String(status), code, title: code }] }), {
    status,
    headers: { 'Content-Type': 'application/vnd.api+json' },
  });
}

/**
 * Reemplazo de `@/lib/tenant/contexto` con la misma semántica que el real: los
 * guards devuelven el error/redirect correspondiente al contexto seteado.
 * `requireContexto` tira `Error('NEXT_REDIRECT:<destino>')`.
 */
export function moduloContextoMock(inicial: ContextoClub | null = mockContexto()) {
  contextoActual = inicial;
  const permitido = (roles?: readonly AppRole[]) => !roles || roles.includes(contextoActual!.rol);

  return {
    CLUB_COOKIE: 'bt_club',
    getContextoClub: vi.fn(async () => contextoActual),
    requireContexto: vi.fn(async (roles?: readonly AppRole[]) => {
      if (!contextoActual) throw new Error('NEXT_REDIRECT:/bienvenida');
      if (!permitido(roles)) throw new Error('NEXT_REDIRECT:/dashboard');
      return contextoActual;
    }),
    contextoAccion: vi.fn(async (roles?: readonly AppRole[]) => {
      if (!contextoActual) return { ok: false as const, error: 'No autorizado' };
      if (!permitido(roles)) return { ok: false as const, error: 'Acceso denegado' };
      return { ok: true as const, contexto: contextoActual };
    }),
    contextoApi: vi.fn(async (roles?: readonly AppRole[]) => {
      if (!contextoActual) return { ok: false as const, response: errorJsonApi(401, 'UNAUTHENTICATED') };
      if (!permitido(roles)) return { ok: false as const, response: errorJsonApi(403, 'FORBIDDEN') };
      return { ok: true as const, contexto: contextoActual };
    }),
  };
}

/**
 * Reemplazo de `@/lib/tenant/db`: `getDb()` y `dbDelClub()` devuelven `db` (el
 * mismo objeto de mocks que antes se pasaba a `vi.mock('@/lib/db')`). Si `db` no
 * trae `$transaction`, se agrega uno que corre el callback con `db` como `tx`; si
 * no trae `$clubId`, devuelve el id de `CLUB_TEST`.
 */
export function moduloDbMock<T extends object>(db: T) {
  const conTx = db as T & { $transaction?: unknown; $clubId?: unknown };
  if (!conTx.$clubId) conTx.$clubId = () => CLUB_TEST.id;
  if (!conTx.$transaction) {
    conTx.$transaction = vi.fn(async (arg: unknown) =>
      typeof arg === 'function' ? arg(db) : Promise.all(arg as Promise<unknown>[]),
    );
  }
  return {
    getDb: vi.fn(async () => db),
    dbDelClub: vi.fn(() => db),
  };
}
