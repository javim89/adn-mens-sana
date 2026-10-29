import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/tenant/contexto', async () =>
  (await import('@/test-utils/tenant')).moduloContextoMock(),
);

vi.mock('@/lib/queries/disciplinas', () => ({
  getDisciplinasConCategorias: vi.fn(),
}));

import { getDisciplinasConCategorias } from '@/lib/queries/disciplinas';
import { GET } from '../route';
import { mockContexto, setContexto } from '@/test-utils/tenant';

describe('GET /api/disciplinas', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    setContexto(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(res.headers.get('Content-Type')).toBe('application/vnd.api+json');
    const body = await res.json();
    expect(body.errors[0].status).toBe('401');
  });

  it('returns 200 with JSON:API collection incluyendo categorías anidadas', async () => {
    setContexto(mockContexto('admin', { userId: 'user1' }));
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
