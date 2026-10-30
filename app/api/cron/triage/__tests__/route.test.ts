import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockClubFindMany, mockDbDelClub, mockLimpiar } = vi.hoisted(() => ({
  mockClubFindMany: vi.fn(),
  mockLimpiar: vi.fn(),
  // Un "cliente" distinguible por club, para ver que cada club usa el suyo.
  mockDbDelClub: vi.fn((clubId: string) => ({ __club: clubId })),
}));

vi.mock('@/lib/db', () => ({ prisma: { club: { findMany: mockClubFindMany } } }));
vi.mock('@/lib/tenant/db', () => ({ dbDelClub: mockDbDelClub }));
vi.mock('@/lib/tenant/insights-sesion', () => ({
  limpiarSesionesInsightsVencidas: mockLimpiar,
}));
vi.mock('@/lib/triage/recompute', () => ({
  recomputeAll: vi.fn(),
}));

import { recomputeAll } from '@/lib/triage/recompute';
import { POST } from '../route';

const OLD_SECRET = process.env.CRON_SECRET;

function conSecreto() {
  return new Request('http://localhost/api/cron/triage', {
    method: 'POST',
    headers: { Authorization: 'Bearer test-secret' },
  });
}

const RESUMEN = (procesados: number) => ({
  procesados,
  byNivel: { VERDE: procesados, AMARILLO: 0, NARANJA: 0, ROJO: 0 },
});

describe('POST /api/cron/triage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'test-secret';
    mockClubFindMany.mockResolvedValue([{ id: 'club_a' }, { id: 'club_b' }]);
    mockLimpiar.mockResolvedValue(0);
  });

  it('returns 401 without the secret', async () => {
    const res = await POST(new Request('http://localhost/api/cron/triage', { method: 'POST' }));
    expect(res.status).toBe(401);
    expect(recomputeAll).not.toHaveBeenCalled();
    expect(mockClubFindMany).not.toHaveBeenCalled();
  });

  it('returns 401 with a wrong secret', async () => {
    const res = await POST(
      new Request('http://localhost/api/cron/triage', {
        method: 'POST',
        headers: { Authorization: 'Bearer nope' },
      }),
    );
    expect(res.status).toBe(401);
    expect(recomputeAll).not.toHaveBeenCalled();
  });

  it('recorre los clubes activos, cada uno con su cliente acotado', async () => {
    vi.mocked(recomputeAll).mockResolvedValueOnce(RESUMEN(2)).mockResolvedValueOnce(RESUMEN(3));

    const res = await POST(conSecreto());

    expect(res.status).toBe(200);
    expect(mockClubFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { activo: true } }));
    expect(mockDbDelClub.mock.calls.map((c) => c[0])).toEqual(['club_a', 'club_b']);
    expect(vi.mocked(recomputeAll).mock.calls.map((c) => c[0])).toEqual([
      { __club: 'club_a' },
      { __club: 'club_b' },
    ]);

    const body = await res.json();
    expect(body.procesados).toBe(5);
    expect(body.clubes).toEqual([
      { clubId: 'club_a', ok: true, ...RESUMEN(2) },
      { clubId: 'club_b', ok: true, ...RESUMEN(3) },
    ]);
  });

  it('un club que falla no frena a los demás y la respuesta es 500', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(recomputeAll)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(RESUMEN(4));

    const res = await POST(conSecreto());

    expect(res.status).toBe(500);
    expect(recomputeAll).toHaveBeenCalledTimes(2);
    const body = await res.json();
    expect(body.procesados).toBe(4);
    expect(body.clubes).toEqual([
      { clubId: 'club_a', ok: false, error: 'boom' },
      { clubId: 'club_b', ok: true, ...RESUMEN(4) },
    ]);
  });

  it('sin clubes activos responde 200 con cero procesados', async () => {
    mockClubFindMany.mockResolvedValue([]);

    const res = await POST(conSecreto());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ procesados: 0, clubes: [], sesionesInsightsBorradas: 0 });
    expect(recomputeAll).not.toHaveBeenCalled();
  });

  it('borra los tokens vencidos de insights_sesiones', async () => {
    vi.mocked(recomputeAll).mockResolvedValue(RESUMEN(1));
    mockLimpiar.mockResolvedValue(7);

    const res = await POST(conSecreto());

    expect(mockLimpiar).toHaveBeenCalledWith(expect.any(Date));
    await expect(res.json()).resolves.toMatchObject({ sesionesInsightsBorradas: 7 });
  });

  it('si falla la limpieza, el triage igual responde 200', async () => {
    vi.mocked(recomputeAll).mockResolvedValue(RESUMEN(1));
    mockLimpiar.mockRejectedValue(new Error('boom'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await POST(conSecreto());

    expect(res.status).toBe(200);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('sin el secreto no limpia nada', async () => {
    await POST(new Request('http://localhost/api/cron/triage', { method: 'POST' }));
    expect(mockLimpiar).not.toHaveBeenCalled();
  });

  afterEach(() => {
    process.env.CRON_SECRET = OLD_SECRET;
  });
});
