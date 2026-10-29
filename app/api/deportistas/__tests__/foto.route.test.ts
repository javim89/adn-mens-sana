import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/tenant/contexto', async () =>
  (await import('@/test-utils/tenant')).moduloContextoMock(),
);

vi.mock('@/lib/s3', async () => {
  const actual = await vi.importActual<typeof import('@/lib/s3')>('@/lib/s3');
  return {
    isValidFotoKey: actual.isValidFotoKey,
    keyEsDelClub: actual.keyEsDelClub,
    deleteFoto: vi.fn(),
    fotoExiste: vi.fn(),
  };
});

vi.mock('@/lib/db', () => ({
  prisma: {
    deportista: { findFirst: vi.fn() },
  },
}));

import { deleteFoto } from '@/lib/s3';
import { prisma } from '@/lib/db';
import { DELETE } from '../foto/route';
import { CLUB_TEST, mockContexto, setContexto } from '@/test-utils/tenant';
import type { AppRole } from '@/lib/roles';


const UUID = '123e4567-e89b-12d3-a456-426614174000';
/** Una subida del club de la sesión (`CLUB_TEST`). */
const KEY = `clubes/${CLUB_TEST.id}/deportistas/${UUID}.jpg`;

function makeRequest(key?: string) {
  const qs = key === undefined ? '' : `?key=${encodeURIComponent(key)}`;
  return new Request(`http://localhost/api/deportistas/foto${qs}`, { method: 'DELETE' });
}

function asRole(role: string) {
  setContexto(mockContexto(role as AppRole, { userId: 'user1' }));
}

describe('DELETE /api/deportistas/foto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setContexto(mockContexto('admin', { userId: 'user1' }));
    asRole('admin');
    vi.mocked(prisma.deportista.findFirst).mockResolvedValue(null);
  });

  it('returns 401 when not authenticated', async () => {
    setContexto(null);

    const res = await DELETE(makeRequest(KEY));

    expect(res.status).toBe(401);
    expect(deleteFoto).not.toHaveBeenCalled();
  });

  it('returns 403 for the social role', async () => {
    asRole('social');

    const res = await DELETE(makeRequest(KEY));

    expect(res.status).toBe(403);
    expect(deleteFoto).not.toHaveBeenCalled();
  });

  it.each([
    undefined,
    '',
    'otros/hack.jpg',
    'deportistas/../../secreto.jpg',
    // Formato válido pero de otro club, o legacy (no dice de qué club es).
    `clubes/club_otro/deportistas/${UUID}.jpg`,
    `deportistas/${UUID}.jpg`,
  ])(
    'returns 422 for an invalid key (%s)',
    async (key) => {
      const res = await DELETE(makeRequest(key));

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.errors[0].status).toBe('422');
      expect(prisma.deportista.findFirst).not.toHaveBeenCalled();
      expect(deleteFoto).not.toHaveBeenCalled();
    },
  );

  it('returns 409 and does not delete when a deportista references the key', async () => {
    vi.mocked(prisma.deportista.findFirst).mockResolvedValue({ id: 'cuid1' } as never);

    const res = await DELETE(makeRequest(KEY));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.errors[0].status).toBe('409');
    expect(prisma.deportista.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { fotoKey: KEY } }),
    );
    expect(deleteFoto).not.toHaveBeenCalled();
  });

  it('deletes an orphan upload and returns 204', async () => {
    const res = await DELETE(makeRequest(KEY));

    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
    expect(deleteFoto).toHaveBeenCalledWith(KEY);
  });
});
