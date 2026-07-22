import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    categoria: { findMany: vi.fn() },
  };
  return { mockPrisma };
});

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));

import { getCategorias } from '../categorias';

describe('getCategorias', () => {
  beforeEach(() => vi.clearAllMocks());

  it('devuelve el catálogo ordenado por orden asc', async () => {
    const rows = [
      { id: 'cat-4', nombre: '4ta', orden: 1 },
      { id: 'cat-sub12', nombre: 'SUB-12', orden: 7 },
    ];
    mockPrisma.categoria.findMany.mockResolvedValue(rows);

    const result = await getCategorias();

    expect(result).toEqual(rows);
    expect(mockPrisma.categoria.findMany).toHaveBeenCalledWith({
      select: { id: true, nombre: true, orden: true },
      orderBy: { orden: 'asc' },
    });
  });
});
