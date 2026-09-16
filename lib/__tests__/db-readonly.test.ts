import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockPrisma, PrismaNeonMock, PrismaClientMock } = vi.hoisted(() => ({
  mockPrisma: { __id: 'principal' },
  PrismaNeonMock: vi.fn(),
  PrismaClientMock: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@prisma/adapter-neon', () => ({
  PrismaNeon: class {
    constructor(config: unknown) {
      PrismaNeonMock(config);
    }
  },
}));
vi.mock('@/lib/generated/prisma/client', () => ({
  PrismaClient: class {
    __id = 'readonly';
    constructor(config: unknown) {
      PrismaClientMock(config);
    }
  },
}));

import {
  __resetReadOnlyPrisma,
  getReadOnlyPrisma,
  isReadOnlyConfigured,
} from '../db-readonly';

const ORIGINAL = process.env.DATABASE_URL_READONLY;

beforeEach(() => {
  vi.clearAllMocks();
  __resetReadOnlyPrisma();
  delete process.env.DATABASE_URL_READONLY;
});

afterEach(() => {
  __resetReadOnlyPrisma();
  if (ORIGINAL === undefined) delete process.env.DATABASE_URL_READONLY;
  else process.env.DATABASE_URL_READONLY = ORIGINAL;
});

describe('sin DATABASE_URL_READONLY', () => {
  it('cae al cliente principal', () => {
    expect(getReadOnlyPrisma()).toBe(mockPrisma);
  });

  it('no construye ningún cliente extra', () => {
    getReadOnlyPrisma();
    expect(PrismaClientMock).not.toHaveBeenCalled();
    expect(PrismaNeonMock).not.toHaveBeenCalled();
  });

  it('reporta que la capa no está activa', () => {
    expect(isReadOnlyConfigured()).toBe(false);
  });

  it('una cadena vacía se trata como no configurada', () => {
    process.env.DATABASE_URL_READONLY = '';
    expect(getReadOnlyPrisma()).toBe(mockPrisma);
    expect(isReadOnlyConfigured()).toBe(false);
  });
});

describe('con DATABASE_URL_READONLY', () => {
  const URL_RO = 'postgresql://insights_ro:secreto@host/neondb';

  beforeEach(() => {
    process.env.DATABASE_URL_READONLY = URL_RO;
  });

  it('devuelve un cliente distinto del principal', () => {
    const client = getReadOnlyPrisma();
    expect(client).not.toBe(mockPrisma);
    expect((client as unknown as { __id: string }).__id).toBe('readonly');
  });

  it('usa la connection string de solo lectura, no la principal', () => {
    getReadOnlyPrisma();
    expect(PrismaNeonMock).toHaveBeenCalledWith({ connectionString: URL_RO });
  });

  it('reporta que la capa está activa', () => {
    expect(isReadOnlyConfigured()).toBe(true);
  });

  // Sin cache, cada llamada abriría un Pool nuevo y agotaría las conexiones
  // de Neon apenas el dashboard resolviera sus widgets en paralelo.
  it('construye el cliente una sola vez', () => {
    getReadOnlyPrisma();
    getReadOnlyPrisma();
    getReadOnlyPrisma();

    expect(PrismaClientMock).toHaveBeenCalledTimes(1);
    expect(PrismaNeonMock).toHaveBeenCalledTimes(1);
  });

  it('devuelve siempre la misma instancia', () => {
    expect(getReadOnlyPrisma()).toBe(getReadOnlyPrisma());
  });
});

describe('cache negativo', () => {
  it('no reintenta construir cuando ya resolvió que no hay variable', () => {
    getReadOnlyPrisma();
    getReadOnlyPrisma();

    // La segunda llamada no debe volver a mirar el entorno ni construir nada.
    expect(PrismaClientMock).not.toHaveBeenCalled();
  });
});
