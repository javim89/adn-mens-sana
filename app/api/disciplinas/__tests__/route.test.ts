import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/queries/disciplinas', () => ({
  getDisciplinasConCategorias: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { getDisciplinasConCategorias } from '@/lib/queries/disciplinas';
import { GET } from '../route';

describe('GET /api/disciplinas', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(res.headers.get('Content-Type')).toBe('application/vnd.api+json');
    const body = await res.json();
    expect(body.errors[0].status).toBe('401');
  });

  it('returns 200 with JSON:API collection incluyendo categorías anidadas', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user1' } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    vi.mocked(getDisciplinasConCategorias).mockResolvedValue([
      {
        id: 'disc-futbol',
        nombre: 'Fútbol',
        categorias: [
          { id: 'cat-primera', nombre: 'Primera' },
          { id: 'cat-reserva', nombre: 'Reserva' },
        ],
      },
      {
        id: 'disc-basquet',
        nombre: 'Básquet',
        categorias: [],
      },
    ]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/vnd.api+json');
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0]).toEqual({
      type: 'disciplinas',
      id: 'disc-futbol',
      attributes: {
        nombre: 'Fútbol',
        categorias: [
          { id: 'cat-primera', nombre: 'Primera' },
          { id: 'cat-reserva', nombre: 'Reserva' },
        ],
      },
    });
    // Disciplina sin categorías serializa un array vacío.
    expect(body.data[1].attributes.categorias).toEqual([]);
    expect(body.meta.total).toBe(2);
  });
});
