import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/queries/categorias', () => ({
  getCategorias: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { getCategorias } from '@/lib/queries/categorias';
import { GET } from '../route';

describe('GET /api/categorias', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(res.headers.get('Content-Type')).toBe('application/vnd.api+json');
    const body = await res.json();
    expect(body.errors[0].status).toBe('401');
  });

  it('returns 200 with JSON:API collection ordered by orden', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user1' } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    vi.mocked(getCategorias).mockResolvedValue([
      { id: 'cat-4', nombre: '4ta', orden: 1 },
      { id: 'cat-sub12', nombre: 'SUB-12', orden: 7 },
    ]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/vnd.api+json');
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0]).toEqual({
      type: 'categorias',
      id: 'cat-4',
      attributes: { nombre: '4ta', orden: 1 },
    });
    expect(body.data[1].attributes).toEqual({ nombre: 'SUB-12', orden: 7 });
    expect(body.meta.total).toBe(2);
  });
});
