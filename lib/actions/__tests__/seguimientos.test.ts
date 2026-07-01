import { describe, test, expect, vi, beforeEach } from 'vitest';

// All mocks must be hoisted before vi.mock calls
const { mockAuth, mockCurrentUser, mockRevalidatePath, mockPrisma, mockClerkClient } = vi.hoisted(
  () => {
    const mockAuth = vi.fn().mockResolvedValue({ userId: 'user_medico_123' });
    const mockCurrentUser = vi.fn().mockResolvedValue({
      publicMetadata: { role: 'medico' },
    });
    const mockRevalidatePath = vi.fn();
    const mockClerkClient = vi.fn().mockResolvedValue({
      users: {
        getUserList: vi.fn().mockResolvedValue({ data: [] }),
      },
    });
    const mockPrisma = {
      seguimiento: {
        create: vi.fn().mockResolvedValue({ id: 'new-seguimiento-id' }),
        update: vi.fn().mockResolvedValue({ id: 'existing-id' }),
        delete: vi.fn().mockResolvedValue({ id: 'deleted-id' }),
        findUnique: vi.fn().mockResolvedValue({
          id: 'existing-id',
          profesionalId: 'user_medico_123',
          titulo: 'Seguimiento existente',
        }),
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

import {
  createSeguimiento,
  updateSeguimiento,
  deleteSeguimiento,
} from '../seguimientos';
import type { SeguimientoFormData } from '@/lib/types/seguimientos';

const validData: SeguimientoFormData = {
  deportistaId: 'dep-123',
  profesionalId: 'some-prof-id',
  fecha: '2026-07-01',
  titulo: 'Evaluación de rodilla',
  prioridad: 'MEDIA',
};

// Helper to set caller as a health professional
function setCallerAsMedico(userId = 'user_medico_123') {
  mockAuth.mockResolvedValue({ userId });
  mockCurrentUser.mockResolvedValue({ publicMetadata: { role: 'medico' } });
}

// Helper to set caller as admin
function setCallerAsAdmin(userId = 'user_admin_456') {
  mockAuth.mockResolvedValue({ userId });
  mockCurrentUser.mockResolvedValue({ publicMetadata: { role: 'admin' } });
}

// Helper to set caller as entrenador (no write access)
function setCallerAsEntrenador(userId = 'user_entrenador_789') {
  mockAuth.mockResolvedValue({ userId });
  mockCurrentUser.mockResolvedValue({ publicMetadata: { role: 'entrenador' } });
}

// ─── createSeguimiento ────────────────────────────────────────────────────────

describe('createSeguimiento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCallerAsMedico();
    mockPrisma.seguimiento.create.mockResolvedValue({ id: 'new-seguimiento-id' });
  });

  test('1. rechaza si no autenticado (userId = null)', async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });
    const result = await createSeguimiento(validData);
    expect(result).toEqual({ success: false, error: 'No autorizado' });
    expect(mockPrisma.seguimiento.create).not.toHaveBeenCalled();
  });

  test('2. rechaza si rol no está en CAN_WRITE_ROLES (entrenador)', async () => {
    setCallerAsEntrenador();
    const result = await createSeguimiento(validData);
    expect(result).toEqual({ success: false, error: 'No autorizado' });
    expect(mockPrisma.seguimiento.create).not.toHaveBeenCalled();
  });

  test('3. rechaza si titulo está vacío', async () => {
    const result = await createSeguimiento({ ...validData, titulo: '' });
    expect(result).toEqual({ success: false, error: 'El título es requerido' });
    expect(mockPrisma.seguimiento.create).not.toHaveBeenCalled();
  });

  test('4. rechaza si deportistaId está vacío', async () => {
    const result = await createSeguimiento({ ...validData, deportistaId: '' });
    expect(result).toEqual({ success: false, error: 'El deportista es requerido' });
    expect(mockPrisma.seguimiento.create).not.toHaveBeenCalled();
  });

  test('5. éxito como profesional de salud — profesionalId en DB es userId del llamante', async () => {
    setCallerAsMedico('user_medico_123');
    const dataWithDifferentProfId = {
      ...validData,
      profesionalId: 'ignored-prof-id', // debe ser ignorado
    };
    const result = await createSeguimiento(dataWithDifferentProfId);
    expect(result.success).toBe(true);
    // Verifica que el create fue llamado con el userId del llamante, no el data.profesionalId
    expect(mockPrisma.seguimiento.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          profesionalId: 'user_medico_123',
        }),
      }),
    );
  });

  test('6. éxito como admin — profesionalId en DB es data.profesionalId', async () => {
    setCallerAsAdmin('user_admin_456');
    const dataWithProfId = {
      ...validData,
      profesionalId: 'target-prof-id',
    };
    const result = await createSeguimiento(dataWithProfId);
    expect(result.success).toBe(true);
    expect(mockPrisma.seguimiento.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          profesionalId: 'target-prof-id',
        }),
      }),
    );
  });
});

// ─── updateSeguimiento ────────────────────────────────────────────────────────

describe('updateSeguimiento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCallerAsMedico('user_medico_123');
    // Por defecto el seguimiento existente pertenece al mismo médico
    mockPrisma.seguimiento.findUnique.mockResolvedValue({
      id: 'existing-id',
      profesionalId: 'user_medico_123',
    });
    mockPrisma.seguimiento.update.mockResolvedValue({ id: 'existing-id' });
  });

  test('7. rechaza si el llamante es profesional y NO es el dueño', async () => {
    setCallerAsMedico('user_otro_medico_999');
    // El seguimiento pertenece a user_medico_123, no a user_otro_medico_999
    mockPrisma.seguimiento.findUnique.mockResolvedValue({
      id: 'existing-id',
      profesionalId: 'user_medico_123',
    });
    const result = await updateSeguimiento('existing-id', validData);
    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toContain('No autorizado');
    expect(mockPrisma.seguimiento.update).not.toHaveBeenCalled();
  });

  test('8. éxito si el llamante es el dueño del seguimiento', async () => {
    setCallerAsMedico('user_medico_123');
    mockPrisma.seguimiento.findUnique.mockResolvedValue({
      id: 'existing-id',
      profesionalId: 'user_medico_123',
    });
    const result = await updateSeguimiento('existing-id', validData);
    expect(result.success).toBe(true);
    expect(mockPrisma.seguimiento.update).toHaveBeenCalled();
  });
});

// ─── deleteSeguimiento ────────────────────────────────────────────────────────

describe('deleteSeguimiento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.seguimiento.findUnique.mockResolvedValue({
      id: 'existing-id',
      profesionalId: 'user_medico_123',
    });
    mockPrisma.seguimiento.delete.mockResolvedValue({ id: 'deleted-id' });
  });

  test('9. rechaza si el llamante es profesional de salud y NO es el dueño', async () => {
    setCallerAsMedico('user_otro_medico_999');
    const result = await deleteSeguimiento('existing-id');
    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toContain('No autorizado');
    expect(mockPrisma.seguimiento.delete).not.toHaveBeenCalled();
  });

  test('10. éxito si es admin aunque NO sea el dueño (ownership bypass for admin)', async () => {
    setCallerAsAdmin('user_admin_456');
    // El seguimiento pertenece a user_medico_123, no al admin
    mockPrisma.seguimiento.findUnique.mockResolvedValue({
      id: 'existing-id',
      profesionalId: 'user_medico_123',
    });
    const result = await deleteSeguimiento('existing-id');
    expect(result.success).toBe(true);
    expect(mockPrisma.seguimiento.delete).toHaveBeenCalledWith({ where: { id: 'existing-id' } });
  });

  test('11. éxito si es el dueño aunque no sea admin', async () => {
    setCallerAsMedico('user_medico_123');
    mockPrisma.seguimiento.findUnique.mockResolvedValue({
      id: 'existing-id',
      profesionalId: 'user_medico_123',
    });
    const result = await deleteSeguimiento('existing-id');
    expect(result.success).toBe(true);
    expect(mockPrisma.seguimiento.delete).toHaveBeenCalledWith({ where: { id: 'existing-id' } });
  });
});
