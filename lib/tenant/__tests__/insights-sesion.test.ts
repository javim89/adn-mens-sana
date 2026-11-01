import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockCreate, mockDeleteMany } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockDeleteMany: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: { insightsSesion: { create: mockCreate, deleteMany: mockDeleteMany } },
}));

const { tokenDeInsights, limpiarSesionesInsightsVencidas, TTL_SESION_MS } = await import('../insights-sesion');

beforeEach(() => {
  vi.clearAllMocks();
  mockCreate.mockResolvedValue({});
});

afterEach(() => {
  vi.useRealTimers();
});

describe('tokenDeInsights', () => {
  it('inserta un token aleatorio de 32 bytes atado al club, con vencimiento a 60 s', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-30T12:00:00.000Z') });

    const token = await tokenDeInsights('club_a');

    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(mockCreate).toHaveBeenCalledWith({
      data: { token, clubId: 'club_a', expira: new Date(Date.now() + TTL_SESION_MS) },
    });
  });

  it('dos ejecuciones fuera de un render no comparten token', async () => {
    const a = await tokenDeInsights('club_a');
    const b = await tokenDeInsights('club_a');
    expect(a).not.toBe(b);
  });

  it('si la inserción falla, no devuelve token', async () => {
    mockCreate.mockRejectedValue(new Error('db caída'));
    await expect(tokenDeInsights('club_a')).rejects.toThrow('db caída');
  });
});

describe('limpiarSesionesInsightsVencidas', () => {
  it('borra solo las vencidas y devuelve cuántas', async () => {
    mockDeleteMany.mockResolvedValue({ count: 3 });
    const now = new Date('2026-10-30T12:00:00.000Z');

    await expect(limpiarSesionesInsightsVencidas(now)).resolves.toBe(3);
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { expira: { lt: now } } });
  });
});
