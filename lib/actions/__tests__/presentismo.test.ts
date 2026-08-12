import { describe, test, expect, vi, beforeEach } from 'vitest';

// All mocks must be hoisted before vi.mock calls
const { mockAuth, mockCurrentUser, mockRevalidatePath, mockPrisma, mockClerkClient } = vi.hoisted(
  () => {
    const mockAuth = vi.fn().mockResolvedValue({ userId: 'user_entrenador_1' });
    const mockCurrentUser = vi.fn().mockResolvedValue({
      publicMetadata: { role: 'entrenador' },
    });
    const mockRevalidatePath = vi.fn();
    const mockClerkClient = vi.fn().mockResolvedValue({
      users: {
        getUserList: vi.fn().mockResolvedValue({ data: [] }),
      },
    });

    const mockPrisma = {
      entrenamiento: {
        create: vi.fn().mockResolvedValue({ id: 'new-entrenamiento-id' }),
        update: vi.fn().mockResolvedValue({ id: 'existing-id' }),
        delete: vi.fn().mockResolvedValue({ id: 'deleted-id' }),
        findUnique: vi.fn().mockResolvedValue({
          id: 'existing-id',
          registradoPor: 'user_entrenador_1',
          entrenadorId: 'user_entrenador_1',
        }),
      },
      asistencia: {
        deleteMany: vi.fn().mockResolvedValue({}),
      },
    };
    return { mockAuth, mockCurrentUser, mockRevalidatePath, mockPrisma, mockClerkClient };
  },
);

vi.mock('@clerk/nextjs/server', () => ({
  auth: mockAuth,
  currentUser: mockCurrentUser,
  clerkClient: mockClerkClient,
}));
vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));

import { createEntrenamiento, updateEntrenamiento, deleteEntrenamiento } from '../presentismo';
import type { EntrenamientoFormData } from '@/lib/types/presentismo';

const validData: EntrenamientoFormData = {
  fecha: '2026-08-01',
  tipoSesion: 'TECNICO',
  disciplinaId: 'disc-1',
  categoriaId: 'cat-1',
  entrenadorId: 'target-entrenador-id',
  asistencias: [
    { deportistaId: 'dep-1', estado: 'PRESENTE' },
    { deportistaId: 'dep-2', estado: 'AUSENTE' },
  ],
};

function setCallerAsEntrenador(userId = 'user_entrenador_1') {
  mockAuth.mockResolvedValue({ userId });
  mockCurrentUser.mockResolvedValue({ publicMetadata: { role: 'entrenador' } });
}

function setCallerAsAdmin(userId = 'user_admin_1') {
  mockAuth.mockResolvedValue({ userId });
  mockCurrentUser.mockResolvedValue({ publicMetadata: { role: 'admin' } });
}

// ─── createEntrenamiento ──────────────────────────────────────────────────────

describe('createEntrenamiento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCallerAsEntrenador();
    mockPrisma.entrenamiento.create.mockResolvedValue({ id: 'new-entrenamiento-id' });
  });

  test('1. rechaza si no autenticado (userId = null)', async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });
    const result = await createEntrenamiento(validData);
    expect(result).toEqual({ success: false, error: 'No autorizado' });
    expect(mockPrisma.entrenamiento.create).not.toHaveBeenCalled();
  });

  test('2. rechaza si falta la fecha', async () => {
    const result = await createEntrenamiento({ ...validData, fecha: '' });
    expect(result).toEqual({ success: false, error: 'La fecha es requerida' });
    expect(mockPrisma.entrenamiento.create).not.toHaveBeenCalled();
  });

  test('3. rechaza si falta el tipo de sesión', async () => {
    const result = await createEntrenamiento({
      ...validData,
      // @ts-expect-error probamos entrada inválida
      tipoSesion: '',
    });
    expect(result).toEqual({ success: false, error: 'El tipo de sesión es requerido' });
    expect(mockPrisma.entrenamiento.create).not.toHaveBeenCalled();
  });

  test('4. rechaza si el plantel (asistencias) está vacío', async () => {
    const result = await createEntrenamiento({ ...validData, asistencias: [] });
    expect(result).toEqual({
      success: false,
      error: 'Debe registrar al menos un deportista',
    });
    expect(mockPrisma.entrenamiento.create).not.toHaveBeenCalled();
  });

  test('5. rechaza si falta la disciplina', async () => {
    const result = await createEntrenamiento({ ...validData, disciplinaId: '' });
    expect(result).toEqual({ success: false, error: 'La disciplina es requerida' });
    expect(mockPrisma.entrenamiento.create).not.toHaveBeenCalled();
  });

  test('6. entrenador: entrenadorId en DB es el userId del llamante (ignora data.entrenadorId)', async () => {
    setCallerAsEntrenador('user_entrenador_1');
    const result = await createEntrenamiento({
      ...validData,
      entrenadorId: 'intento-de-spoof',
    });
    expect(result.success).toBe(true);
    expect(mockPrisma.entrenamiento.create).toHaveBeenCalledWith(
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
    const result = await createEntrenamiento({
      ...validData,
      entrenadorId: 'target-entrenador-id',
    });
    expect(result.success).toBe(true);
    expect(mockPrisma.entrenamiento.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entrenadorId: 'target-entrenador-id',
          registradoPor: 'user_admin_1',
        }),
      }),
    );
  });

  test('8. admin sin entrenadorId -> error "El entrenador es requerido"', async () => {
    setCallerAsAdmin('user_admin_1');
    const result = await createEntrenamiento({ ...validData, entrenadorId: '' });
    expect(result).toEqual({ success: false, error: 'El entrenador es requerido' });
    expect(mockPrisma.entrenamiento.create).not.toHaveBeenCalled();
  });

  test('9. crea las asistencias via createMany y revalida el path', async () => {
    setCallerAsEntrenador('user_entrenador_1');
    const result = await createEntrenamiento(validData);
    expect(result).toEqual({ success: true, id: 'new-entrenamiento-id' });
    expect(mockPrisma.entrenamiento.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          asistencias: {
            createMany: {
              data: [
                { deportistaId: 'dep-1', estado: 'PRESENTE', notas: null },
                { deportistaId: 'dep-2', estado: 'AUSENTE', notas: null },
              ],
            },
          },
        }),
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith('/presentismo');
  });
});

// ─── updateEntrenamiento ──────────────────────────────────────────────────────

describe('updateEntrenamiento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCallerAsEntrenador('user_entrenador_1');
    mockPrisma.entrenamiento.findUnique.mockResolvedValue({
      id: 'existing-id',
      registradoPor: 'user_entrenador_1',
      entrenadorId: 'user_entrenador_1',
    });
    mockPrisma.entrenamiento.update.mockResolvedValue({ id: 'existing-id' });
  });

  test('10. rechaza si el entrenador NO es quien lo registró', async () => {
    setCallerAsEntrenador('otro_entrenador_999');
    const result = await updateEntrenamiento('existing-id', validData);
    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toContain('Acceso denegado');
    expect(mockPrisma.entrenamiento.update).not.toHaveBeenCalled();
  });

  test('11. éxito si es el dueño: borra asistencias previas y recrea', async () => {
    setCallerAsEntrenador('user_entrenador_1');
    const result = await updateEntrenamiento('existing-id', validData);
    expect(result.success).toBe(true);
    expect(mockPrisma.asistencia.deleteMany).toHaveBeenCalledWith({
      where: { entrenamientoId: 'existing-id' },
    });
    expect(mockPrisma.entrenamiento.update).toHaveBeenCalled();
  });

  test('12. entrenador no puede reasignar entrenadorId (se conserva el original)', async () => {
    setCallerAsEntrenador('user_entrenador_1');
    await updateEntrenamiento('existing-id', { ...validData, entrenadorId: 'spoof' });
    expect(mockPrisma.entrenamiento.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ entrenadorId: 'user_entrenador_1' }),
      }),
    );
  });

  test('13. admin puede editar aunque no lo haya registrado', async () => {
    setCallerAsAdmin('user_admin_1');
    mockPrisma.entrenamiento.findUnique.mockResolvedValue({
      id: 'existing-id',
      registradoPor: 'user_entrenador_1',
      entrenadorId: 'user_entrenador_1',
    });
    const result = await updateEntrenamiento('existing-id', validData);
    expect(result.success).toBe(true);
  });

  test('14. rechaza si el entrenamiento no existe', async () => {
    setCallerAsAdmin('user_admin_1');
    mockPrisma.entrenamiento.findUnique.mockResolvedValue(null);
    const result = await updateEntrenamiento('missing-id', validData);
    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toContain('no encontrado');
    expect(mockPrisma.entrenamiento.update).not.toHaveBeenCalled();
  });
});

// ─── deleteEntrenamiento ──────────────────────────────────────────────────────

describe('deleteEntrenamiento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.entrenamiento.findUnique.mockResolvedValue({
      id: 'existing-id',
      registradoPor: 'user_entrenador_1',
      entrenadorId: 'user_entrenador_1',
    });
    mockPrisma.entrenamiento.delete.mockResolvedValue({ id: 'deleted-id' });
  });

  test('15. rechaza si el entrenador NO es el dueño', async () => {
    setCallerAsEntrenador('otro_entrenador_999');
    const result = await deleteEntrenamiento('existing-id');
    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toContain('Acceso denegado');
    expect(mockPrisma.entrenamiento.delete).not.toHaveBeenCalled();
  });

  test('16. admin puede borrar aunque no sea el dueño', async () => {
    setCallerAsAdmin('user_admin_1');
    const result = await deleteEntrenamiento('existing-id');
    expect(result.success).toBe(true);
    expect(mockPrisma.entrenamiento.delete).toHaveBeenCalledWith({ where: { id: 'existing-id' } });
  });

  test('17. éxito si es el dueño', async () => {
    setCallerAsEntrenador('user_entrenador_1');
    const result = await deleteEntrenamiento('existing-id');
    expect(result.success).toBe(true);
    expect(mockPrisma.entrenamiento.delete).toHaveBeenCalledWith({ where: { id: 'existing-id' } });
  });
});
