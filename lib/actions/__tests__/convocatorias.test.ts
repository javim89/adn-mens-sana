import { describe, test, expect, vi, beforeEach } from 'vitest';

// All mocks must be hoisted before vi.mock calls
const { mockAuth, mockCurrentUser, mockRevalidatePath, mockPrisma } = vi.hoisted(() => {
  const mockAuth = vi.fn().mockResolvedValue({ userId: 'user_entrenador_1' });
  const mockCurrentUser = vi.fn().mockResolvedValue({
    publicMetadata: { role: 'entrenador' },
  });
  const mockRevalidatePath = vi.fn();

  const mockPrisma = {
    convocatoria: {
      create: vi.fn().mockResolvedValue({ id: 'new-convocatoria-id' }),
      update: vi.fn().mockResolvedValue({ id: 'existing-id' }),
      delete: vi.fn().mockResolvedValue({ id: 'deleted-id' }),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    convocatoriaDeportista: {
      deleteMany: vi.fn().mockResolvedValue({}),
    },
  };
  return { mockAuth, mockCurrentUser, mockRevalidatePath, mockPrisma };
});

vi.mock('@clerk/nextjs/server', () => ({
  auth: mockAuth,
  currentUser: mockCurrentUser,
}));
vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));

// El módulo de queries es importado por la action; lo mockeamos para aislar la lógica.
vi.mock('@/lib/queries/convocatorias', () => ({
  getProximoPartido: vi.fn(),
  getDeportistasParaConvocar: vi.fn(),
}));

import {
  createConvocatoria,
  updateConvocatoria,
  deleteConvocatoria,
} from '../convocatorias';
import type { ConvocatoriaFormData } from '@/lib/types/convocatorias';

const validData: ConvocatoriaFormData = {
  eventoTorneoId: 'evento-1',
  disciplinaId: 'disc-1',
  categoriaId: 'cat-1',
  entrenadorId: 'target-entrenador-id',
  horaCitacion: '10:00',
  lugar: 'Sede central',
  observaciones: 'Llegar temprano',
  convocados: ['dep-1', 'dep-2'],
};

function setCallerAsEntrenador(userId = 'user_entrenador_1') {
  mockAuth.mockResolvedValue({ userId });
  mockCurrentUser.mockResolvedValue({ publicMetadata: { role: 'entrenador' } });
}

function setCallerAsAdmin(userId = 'user_admin_1') {
  mockAuth.mockResolvedValue({ userId });
  mockCurrentUser.mockResolvedValue({ publicMetadata: { role: 'admin' } });
}

// ─── createConvocatoria ───────────────────────────────────────────────────────

describe('createConvocatoria', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCallerAsEntrenador();
    mockPrisma.convocatoria.findUnique.mockResolvedValue(null);
    mockPrisma.convocatoria.create.mockResolvedValue({ id: 'new-convocatoria-id' });
  });

  test('1. rechaza si no autenticado (userId = null)', async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });
    const result = await createConvocatoria(validData);
    expect(result).toEqual({ success: false, error: 'No autorizado' });
    expect(mockPrisma.convocatoria.create).not.toHaveBeenCalled();
  });

  test('2. rechaza si falta el partido (eventoTorneoId)', async () => {
    const result = await createConvocatoria({ ...validData, eventoTorneoId: '' });
    expect(result).toEqual({ success: false, error: 'El partido es requerido' });
    expect(mockPrisma.convocatoria.create).not.toHaveBeenCalled();
  });

  test('3. rechaza si falta la disciplina', async () => {
    const result = await createConvocatoria({ ...validData, disciplinaId: '' });
    expect(result).toEqual({ success: false, error: 'La disciplina es requerida' });
    expect(mockPrisma.convocatoria.create).not.toHaveBeenCalled();
  });

  test('4. rechaza si falta la categoría', async () => {
    const result = await createConvocatoria({ ...validData, categoriaId: '' });
    expect(result).toEqual({ success: false, error: 'La categoría es requerida' });
    expect(mockPrisma.convocatoria.create).not.toHaveBeenCalled();
  });

  test('5. rechaza si el plantel (convocados) está vacío', async () => {
    const result = await createConvocatoria({ ...validData, convocados: [] });
    expect(result).toEqual({
      success: false,
      error: 'Debe convocar al menos un deportista',
    });
    expect(mockPrisma.convocatoria.create).not.toHaveBeenCalled();
  });

  test('6. entrenador: entrenadorId en DB es el userId del llamante (ignora data.entrenadorId)', async () => {
    setCallerAsEntrenador('user_entrenador_1');
    const result = await createConvocatoria({
      ...validData,
      entrenadorId: 'intento-de-spoof',
    });
    expect(result.success).toBe(true);
    expect(mockPrisma.convocatoria.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entrenadorId: 'user_entrenador_1',
          registradoPor: 'user_entrenador_1',
        }),
      }),
    );
  });

  test('7. admin: entrenadorId en DB es data.entrenadorId; registradoPor es el admin', async () => {
    setCallerAsAdmin('user_admin_1');
    const result = await createConvocatoria({
      ...validData,
      entrenadorId: 'target-entrenador-id',
    });
    expect(result.success).toBe(true);
    expect(mockPrisma.convocatoria.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entrenadorId: 'target-entrenador-id',
          registradoPor: 'user_admin_1',
        }),
      }),
    );
  });

  test('8. admin sin entrenadorId -> usa su propio userId y crea con éxito', async () => {
    setCallerAsAdmin('user_admin_1');
    const result = await createConvocatoria({ ...validData, entrenadorId: '' });
    expect(result.success).toBe(true);
    expect(mockPrisma.convocatoria.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entrenadorId: 'user_admin_1',
          registradoPor: 'user_admin_1',
        }),
      }),
    );
  });

  test('9. bloquea duplicado: ya existe convocatoria para ese partido', async () => {
    setCallerAsEntrenador('user_entrenador_1');
    mockPrisma.convocatoria.findUnique.mockResolvedValue({ id: 'ya-existe' });
    const result = await createConvocatoria(validData);
    expect(result).toEqual({
      success: false,
      error: 'Ya existe una convocatoria para este partido',
    });
    expect(mockPrisma.convocatoria.findUnique).toHaveBeenCalledWith({
      where: { eventoTorneoId: 'evento-1' },
    });
    expect(mockPrisma.convocatoria.create).not.toHaveBeenCalled();
  });

  test('10. crea los convocados via createMany y revalida el path', async () => {
    setCallerAsEntrenador('user_entrenador_1');
    const result = await createConvocatoria(validData);
    expect(result).toEqual({ success: true, id: 'new-convocatoria-id' });
    expect(mockPrisma.convocatoria.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          convocados: {
            createMany: {
              data: [{ deportistaId: 'dep-1' }, { deportistaId: 'dep-2' }],
            },
          },
        }),
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith('/convocatorias');
  });
});

// ─── updateConvocatoria ───────────────────────────────────────────────────────

describe('updateConvocatoria', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCallerAsEntrenador('user_entrenador_1');
    mockPrisma.convocatoria.findUnique.mockResolvedValue({
      id: 'existing-id',
      registradoPor: 'user_entrenador_1',
      entrenadorId: 'user_entrenador_1',
    });
    mockPrisma.convocatoria.update.mockResolvedValue({ id: 'existing-id' });
  });

  test('11. rechaza si el entrenador NO es quien lo registró', async () => {
    setCallerAsEntrenador('otro_entrenador_999');
    const result = await updateConvocatoria('existing-id', validData);
    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toContain('Acceso denegado');
    expect(mockPrisma.convocatoria.update).not.toHaveBeenCalled();
  });

  test('12. rechaza si la convocatoria no existe', async () => {
    setCallerAsAdmin('user_admin_1');
    mockPrisma.convocatoria.findUnique.mockResolvedValue(null);
    const result = await updateConvocatoria('missing-id', validData);
    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toContain('no encontrada');
    expect(mockPrisma.convocatoria.update).not.toHaveBeenCalled();
  });

  test('13. éxito si es el dueño: borra convocados previos y recrea', async () => {
    setCallerAsEntrenador('user_entrenador_1');
    const result = await updateConvocatoria('existing-id', validData);
    expect(result.success).toBe(true);
    expect(mockPrisma.convocatoriaDeportista.deleteMany).toHaveBeenCalledWith({
      where: { convocatoriaId: 'existing-id' },
    });
    expect(mockPrisma.convocatoria.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'existing-id' },
        data: expect.objectContaining({
          convocados: {
            createMany: {
              data: [{ deportistaId: 'dep-1' }, { deportistaId: 'dep-2' }],
            },
          },
        }),
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith('/convocatorias');
  });

  test('14. admin puede editar aunque no lo haya registrado', async () => {
    setCallerAsAdmin('user_admin_1');
    mockPrisma.convocatoria.findUnique.mockResolvedValue({
      id: 'existing-id',
      registradoPor: 'user_entrenador_1',
      entrenadorId: 'user_entrenador_1',
    });
    const result = await updateConvocatoria('existing-id', validData);
    expect(result.success).toBe(true);
  });

  test('15. entrenador no puede reasignar entrenadorId (se conserva el original)', async () => {
    setCallerAsEntrenador('user_entrenador_1');
    await updateConvocatoria('existing-id', { ...validData, entrenadorId: 'spoof' });
    expect(mockPrisma.convocatoria.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ entrenadorId: 'user_entrenador_1' }),
      }),
    );
  });
});

// ─── deleteConvocatoria ───────────────────────────────────────────────────────

describe('deleteConvocatoria', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.convocatoria.findUnique.mockResolvedValue({
      id: 'existing-id',
      registradoPor: 'user_entrenador_1',
      entrenadorId: 'user_entrenador_1',
    });
    mockPrisma.convocatoria.delete.mockResolvedValue({ id: 'deleted-id' });
  });

  test('16. rechaza si el entrenador NO es el dueño', async () => {
    setCallerAsEntrenador('otro_entrenador_999');
    const result = await deleteConvocatoria('existing-id');
    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toContain('Acceso denegado');
    expect(mockPrisma.convocatoria.delete).not.toHaveBeenCalled();
  });

  test('17. admin puede borrar aunque no sea el dueño', async () => {
    setCallerAsAdmin('user_admin_1');
    const result = await deleteConvocatoria('existing-id');
    expect(result.success).toBe(true);
    expect(mockPrisma.convocatoria.delete).toHaveBeenCalledWith({ where: { id: 'existing-id' } });
  });

  test('18. éxito si es el dueño', async () => {
    setCallerAsEntrenador('user_entrenador_1');
    const result = await deleteConvocatoria('existing-id');
    expect(result.success).toBe(true);
    expect(mockPrisma.convocatoria.delete).toHaveBeenCalledWith({ where: { id: 'existing-id' } });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/convocatorias');
  });
});
