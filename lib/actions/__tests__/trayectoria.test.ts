import { describe, test, expect, vi, beforeEach } from 'vitest';

const { mockAuth, mockCurrentUser, mockRevalidatePath, mockPrisma, mockTx } =
  vi.hoisted(() => {
    const mockTx = {
      pasoPorDivision: {
        update: vi.fn().mockResolvedValue({ id: 'paso-abierto' }),
        create: vi.fn().mockResolvedValue({ id: 'paso-nuevo' }),
      },
      deportista: {
        update: vi.fn().mockResolvedValue({ id: 'deportista-1' }),
      },
    };
    const mockPrisma = {
      deportista: {
        findUnique: vi.fn().mockResolvedValue({ id: 'deportista-1' }),
      },
      pasoPorDivision: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'paso-abierto',
          desde: new Date('2024-01-01'),
          hasta: null,
        }),
        findUnique: vi.fn().mockResolvedValue({ deportistaId: 'deportista-1' }),
        update: vi.fn().mockResolvedValue({ id: 'paso-1' }),
        delete: vi.fn().mockResolvedValue({ id: 'paso-1' }),
      },
      $transaction: vi.fn(async (cb: (tx: typeof mockTx) => Promise<unknown>) =>
        cb(mockTx),
      ),
    };
    return {
      mockAuth: vi.fn().mockResolvedValue({ userId: 'user_test_123' }),
      mockCurrentUser: vi
        .fn()
        .mockResolvedValue({ publicMetadata: { role: 'admin' } }),
      mockRevalidatePath: vi.fn(),
      mockPrisma,
      mockTx,
    };
  });

vi.mock('@clerk/nextjs/server', () => ({
  auth: mockAuth,
  currentUser: mockCurrentUser,
}));
vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));

import {
  crearTransicionDivision,
  updatePasoPorDivision,
  deletePasoPorDivision,
} from '../trayectoria';

const validTransicion = {
  deportistaId: 'deportista-1',
  categoriaId: 'cat-4ta',
  disciplinaId: 'disc-futbol',
  fecha: '2025-06-01',
};

describe('crearTransicionDivision', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user_test_123' });
    mockCurrentUser.mockResolvedValue({ publicMetadata: { role: 'admin' } });
    mockPrisma.deportista.findUnique.mockResolvedValue({ id: 'deportista-1' });
    mockPrisma.pasoPorDivision.findFirst.mockResolvedValue({
      id: 'paso-abierto',
      desde: new Date('2024-01-01'),
      hasta: null,
    });
    mockPrisma.$transaction.mockImplementation(
      async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx),
    );
  });

  test('rechaza si no hay userId', async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });
    const result = await crearTransicionDivision(validTransicion);
    expect(result).toEqual({ success: false, error: 'No autorizado' });
  });

  test('rechaza si el rol no es admin', async () => {
    mockCurrentUser.mockResolvedValueOnce({ publicMetadata: { role: 'social' } });
    const result = await crearTransicionDivision(validTransicion);
    expect(result).toEqual({ success: false, error: 'No autorizado' });
  });

  test('rechaza si la fecha no es posterior al inicio del período abierto', async () => {
    const result = await crearTransicionDivision({
      ...validTransicion,
      fecha: '2023-12-31',
    });
    expect(result.success).toBe(false);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  test('cierra el período abierto, crea el nuevo y actualiza la división actual', async () => {
    const result = await crearTransicionDivision(validTransicion);
    expect(result).toEqual({ success: true });

    expect(mockTx.pasoPorDivision.update).toHaveBeenCalledWith({
      where: { id: 'paso-abierto' },
      data: { hasta: new Date('2025-06-01') },
    });

    expect(mockTx.pasoPorDivision.create).toHaveBeenCalledWith({
      data: {
        deportistaId: 'deportista-1',
        categoriaId: 'cat-4ta',
        disciplinaId: 'disc-futbol',
        desde: new Date('2025-06-01'),
        hasta: null,
      },
    });

    expect(mockTx.deportista.update).toHaveBeenCalledWith({
      where: { id: 'deportista-1' },
      data: { categoriaId: 'cat-4ta', disciplinaId: 'disc-futbol' },
    });

    expect(mockRevalidatePath).toHaveBeenCalledWith('/deportistas/deportista-1');
  });

  test('crea el primer período cuando no hay período abierto', async () => {
    mockPrisma.pasoPorDivision.findFirst.mockResolvedValueOnce(null);
    const result = await crearTransicionDivision(validTransicion);
    expect(result).toEqual({ success: true });
    expect(mockTx.pasoPorDivision.update).not.toHaveBeenCalled();
    expect(mockTx.pasoPorDivision.create).toHaveBeenCalled();
  });
});

describe('updatePasoPorDivision', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user_test_123' });
    mockCurrentUser.mockResolvedValue({ publicMetadata: { role: 'admin' } });
    mockPrisma.pasoPorDivision.findUnique.mockResolvedValue({
      deportistaId: 'deportista-1',
    });
  });

  test('rechaza si no hay userId', async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });
    const result = await updatePasoPorDivision({
      id: 'paso-1',
      categoriaId: null,
      disciplinaId: null,
      desde: '2024-01-01',
      hasta: null,
    });
    expect(result).toEqual({ success: false, error: 'No autorizado' });
  });

  test('rechaza si hasta es anterior o igual a desde', async () => {
    const result = await updatePasoPorDivision({
      id: 'paso-1',
      categoriaId: null,
      disciplinaId: null,
      desde: '2024-06-01',
      hasta: '2024-01-01',
    });
    expect(result.success).toBe(false);
    expect(mockPrisma.pasoPorDivision.update).not.toHaveBeenCalled();
  });

  test('actualiza el período y revalida', async () => {
    const result = await updatePasoPorDivision({
      id: 'paso-1',
      categoriaId: 'cat-5ta',
      disciplinaId: 'disc-futbol',
      desde: '2024-01-01',
      hasta: '2024-12-31',
    });
    expect(result).toEqual({ success: true });
    expect(mockPrisma.pasoPorDivision.update).toHaveBeenCalledWith({
      where: { id: 'paso-1' },
      data: {
        categoriaId: 'cat-5ta',
        disciplinaId: 'disc-futbol',
        desde: new Date('2024-01-01'),
        hasta: new Date('2024-12-31'),
      },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/deportistas/deportista-1');
  });
});

describe('deletePasoPorDivision', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user_test_123' });
    mockCurrentUser.mockResolvedValue({ publicMetadata: { role: 'admin' } });
    mockPrisma.pasoPorDivision.findUnique.mockResolvedValue({
      deportistaId: 'deportista-1',
    });
  });

  test('rechaza si no hay userId', async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });
    const result = await deletePasoPorDivision('paso-1');
    expect(result).toEqual({ success: false, error: 'No autorizado' });
  });

  test('elimina el período y revalida', async () => {
    const result = await deletePasoPorDivision('paso-1');
    expect(result).toEqual({ success: true });
    expect(mockPrisma.pasoPorDivision.delete).toHaveBeenCalledWith({
      where: { id: 'paso-1' },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/deportistas/deportista-1');
  });
});
