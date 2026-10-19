import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));

vi.mock('@/lib/s3', async () => {
  const actual = await vi.importActual<typeof import('@/lib/s3')>('@/lib/s3');
  return {
    isValidFotoKey: actual.isValidFotoKey,
    deleteFoto: vi.fn(),
    fotoExiste: vi.fn(),
  };
});

vi.mock('@/lib/db', () => ({
  prisma: {
    deportista: { findFirst: vi.fn() },
  },
}));

import { auth, currentUser } from '@clerk/nextjs/server';
import { deleteFoto } from '@/lib/s3';
import { prisma } from '@/lib/db';
import { DELETE } from '../foto/route';

type AuthResult = ReturnType<typeof auth> extends Promise<infer T> ? T : never;
type CurrentUserResult = ReturnType<typeof currentUser> extends Promise<infer T> ? T : never;

const KEY = 'deportistas/123e4567-e89b-12d3-a456-426614174000.jpg';

function makeRequest(key?: string) {
  const qs = key === undefined ? '' : `?key=${encodeURIComponent(key)}`;
  return new Request(`http://localhost/api/deportistas/foto${qs}`, { method: 'DELETE' });
}

function asRole(role: string) {
  vi.mocked(currentUser).mockResolvedValue({ publicMetadata: { role } } as unknown as CurrentUserResult);
}

describe('DELETE /api/deportistas/foto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ userId: 'user1' } as AuthResult);
    asRole('admin');
    vi.mocked(prisma.deportista.findFirst).mockResolvedValue(null);
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as AuthResult);

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

  it.each([undefined, '', 'otros/hack.jpg', 'deportistas/../../secreto.jpg'])(
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
