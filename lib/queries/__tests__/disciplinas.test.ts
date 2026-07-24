import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    disciplina: { findMany: vi.fn() },
  };
  return { mockPrisma };
});

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));

import { getDisciplinasConCategorias } from '../disciplinas';

describe('getDisciplinasConCategorias', () => {
  beforeEach(() => vi.clearAllMocks());

  it('devuelve las disciplinas con sus categorías anidadas y aplanadas', async () => {
    // Prisma devuelve las categorías a través de la tabla join (M:N).
    mockPrisma.disciplina.findMany.mockResolvedValue([
      {
        id: 'disc-futbol',
        nombre: 'Fútbol',
        categorias: [
          { categoria: { id: 'cat-primera', nombre: 'Primera' } },
          { categoria: { id: 'cat-reserva', nombre: 'Reserva' } },
        ],
      },
      {
        id: 'disc-basquet',
        nombre: 'Básquet',
        categorias: [],
      },
    ]);

    const result = await getDisciplinasConCategorias();

    expect(result).toEqual([
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
  });

  it('ordena por orden asc e incluye la relación con categorías', async () => {
    mockPrisma.disciplina.findMany.mockResolvedValue([]);

    await getDisciplinasConCategorias();

    expect(mockPrisma.disciplina.findMany).toHaveBeenCalledWith({
      orderBy: { orden: 'asc' },
      select: {
        id: true,
        nombre: true,
        categorias: {
          orderBy: { categoria: { orden: 'asc' } },
          select: { categoria: { select: { id: true, nombre: true } } },
        },
      },
    });
  });
});
