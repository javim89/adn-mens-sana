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

    const mockTx = {
      seguimiento: {
        create: vi.fn().mockResolvedValue({ id: 'new-seguimiento-id' }),
        update: vi.fn().mockResolvedValue({ id: 'existing-id' }),
      },
      seguimientoTraumatologia: {
        create: vi.fn().mockResolvedValue({}),
        upsert: vi.fn().mockResolvedValue({}),
        deleteMany: vi.fn().mockResolvedValue({}),
      },
      seguimientoHistoriaClinica: {
        create: vi.fn().mockResolvedValue({}),
        upsert: vi.fn().mockResolvedValue({}),
        deleteMany: vi.fn().mockResolvedValue({}),
      },
      seguimientoEvaluacionPsicologica: {
        create: vi.fn().mockResolvedValue({}),
        upsert: vi.fn().mockResolvedValue({}),
        deleteMany: vi.fn().mockResolvedValue({}),
      },
      seguimientoEvaluacionCardiologica: {
        create: vi.fn().mockResolvedValue({}),
        upsert: vi.fn().mockResolvedValue({}),
        deleteMany: vi.fn().mockResolvedValue({}),
      },
    };

    const mockTransaction = vi.fn().mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(mockTx),
    );

    const mockPrisma = {
      seguimiento: {
        create: vi.fn().mockResolvedValue({ id: 'new-seguimiento-id' }),
        update: vi.fn().mockResolvedValue({ id: 'existing-id' }),
        delete: vi.fn().mockResolvedValue({ id: 'deleted-id' }),
        findUnique: vi.fn().mockResolvedValue({
          id: 'existing-id',
          profesionalId: 'user_medico_123',
          titulo: 'Seguimiento existente',
          tipoSeguimiento: null,
        }),
      },
      $transaction: mockTransaction,
      _tx: mockTx,
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

function setCallerAsMedico(userId = 'user_medico_123') {
  mockAuth.mockResolvedValue({ userId });
  mockCurrentUser.mockResolvedValue({ publicMetadata: { role: 'medico' } });
}

function setCallerAsPsicologo(userId = 'user_psicologo_123') {
  mockAuth.mockResolvedValue({ userId });
  mockCurrentUser.mockResolvedValue({ publicMetadata: { role: 'psicologo' } });
}

function setCallerAsCardiologo(userId = 'user_cardiologo_123') {
  mockAuth.mockResolvedValue({ userId });
  mockCurrentUser.mockResolvedValue({ publicMetadata: { role: 'cardiologo' } });
}

function setCallerAsAdmin(userId = 'user_admin_456') {
  mockAuth.mockResolvedValue({ userId });
  mockCurrentUser.mockResolvedValue({ publicMetadata: { role: 'admin' } });
}

function setCallerAsEntrenador(userId = 'user_entrenador_789') {
  mockAuth.mockResolvedValue({ userId });
  mockCurrentUser.mockResolvedValue({ publicMetadata: { role: 'entrenador' } });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getMockTx = () => (mockPrisma as any)._tx;

// ─── createSeguimiento ────────────────────────────────────────────────────────

describe('createSeguimiento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCallerAsMedico();
    const tx = getMockTx();
    tx.seguimiento.create.mockResolvedValue({ id: 'new-seguimiento-id' });
    tx.seguimientoTraumatologia.create.mockResolvedValue({});
    tx.seguimientoHistoriaClinica.create.mockResolvedValue({});
    tx.seguimientoEvaluacionPsicologica.create.mockResolvedValue({});
    tx.seguimientoEvaluacionCardiologica.create.mockResolvedValue({});
    mockPrisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(tx),
    );
  });

  test('1. rechaza si no autenticado (userId = null)', async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });
    const result = await createSeguimiento(validData);
    expect(result).toEqual({ success: false, error: 'No autorizado' });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  test('2. rechaza si rol no está en CAN_WRITE_ROLES (entrenador)', async () => {
    setCallerAsEntrenador();
    const result = await createSeguimiento(validData);
    expect(result).toEqual({ success: false, error: 'No autorizado' });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  test('3. rechaza si titulo está vacío', async () => {
    const result = await createSeguimiento({ ...validData, titulo: '' });
    expect(result).toEqual({ success: false, error: 'El título es requerido' });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  test('4. rechaza si deportistaId está vacío', async () => {
    const result = await createSeguimiento({ ...validData, deportistaId: '' });
    expect(result).toEqual({ success: false, error: 'El deportista es requerido' });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  test('5. éxito como profesional de salud — profesionalId en DB es userId del llamante', async () => {
    setCallerAsMedico('user_medico_123');
    const dataWithDifferentProfId = { ...validData, profesionalId: 'ignored-prof-id' };
    const result = await createSeguimiento(dataWithDifferentProfId);
    expect(result.success).toBe(true);
    const tx = getMockTx();
    expect(tx.seguimiento.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ profesionalId: 'user_medico_123' }),
      }),
    );
  });

  test('6. éxito como admin — profesionalId en DB es data.profesionalId', async () => {
    setCallerAsAdmin('user_admin_456');
    const dataWithProfId = { ...validData, profesionalId: 'target-prof-id' };
    const result = await createSeguimiento(dataWithProfId);
    expect(result.success).toBe(true);
    const tx = getMockTx();
    expect(tx.seguimiento.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ profesionalId: 'target-prof-id' }),
      }),
    );
  });

  test('7. retrocompatibilidad — sin tipoSeguimiento funciona igual que antes', async () => {
    setCallerAsMedico('user_medico_123');
    const result = await createSeguimiento(validData);
    expect(result.success).toBe(true);
    const tx = getMockTx();
    expect(tx.seguimiento.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tipoSeguimiento: null }),
      }),
    );
    expect(tx.seguimientoTraumatologia.create).not.toHaveBeenCalled();
  });

  test('8. crea registro satélite de traumatología cuando tipo = TRAUMATOLOGIA (médico)', async () => {
    setCallerAsMedico('user_medico_123');
    const dataTrauma: SeguimientoFormData = {
      ...validData,
      tipoSeguimiento: 'TRAUMATOLOGIA',
      datosEspecificos: {
        tipo: 'TRAUMATOLOGIA',
        datos: { estabilidadHombro: 'Normal', postura: 'Cifosis leve' },
      },
    };
    const result = await createSeguimiento(dataTrauma);
    expect(result.success).toBe(true);
    const tx = getMockTx();
    expect(tx.seguimiento.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tipoSeguimiento: 'TRAUMATOLOGIA' }),
      }),
    );
    expect(tx.seguimientoTraumatologia.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          seguimientoId: 'new-seguimiento-id',
          estabilidadHombro: 'Normal',
          postura: 'Cifosis leve',
        }),
      }),
    );
  });

  test('9. crea registro satélite de evaluación psicológica con campos CPRD numéricos', async () => {
    setCallerAsPsicologo('user_psicologo_123');
    const dataPsi: SeguimientoFormData = {
      ...validData,
      tipoSeguimiento: 'EVALUACION_PSICOLOGICA',
      datosEspecificos: {
        tipo: 'EVALUACION_PSICOLOGICA',
        datos: { cprdControlEstres: 25, cprdMotivacion: 30, staiRasgo: 40, staiEstado: 35 },
      },
    };
    const result = await createSeguimiento(dataPsi);
    expect(result.success).toBe(true);
    const tx = getMockTx();
    expect(tx.seguimientoEvaluacionPsicologica.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          seguimientoId: 'new-seguimiento-id',
          cprdControlEstres: 25,
          cprdMotivacion: 30,
          staiRasgo: 40,
          staiEstado: 35,
        }),
      }),
    );
  });

  test('10. rechaza CPRD fuera de rango (> 36)', async () => {
    setCallerAsPsicologo('user_psicologo_123');
    const dataPsi: SeguimientoFormData = {
      ...validData,
      tipoSeguimiento: 'EVALUACION_PSICOLOGICA',
      datosEspecificos: { tipo: 'EVALUACION_PSICOLOGICA', datos: { cprdControlEstres: 37 } },
    };
    const result = await createSeguimiento(dataPsi);
    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toContain('CPRD');
  });

  test('11. rechaza STAI fuera de rango (> 80)', async () => {
    setCallerAsPsicologo('user_psicologo_123');
    const dataPsi: SeguimientoFormData = {
      ...validData,
      tipoSeguimiento: 'EVALUACION_PSICOLOGICA',
      datosEspecificos: { tipo: 'EVALUACION_PSICOLOGICA', datos: { staiRasgo: 81 } },
    };
    const result = await createSeguimiento(dataPsi);
    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toContain('STAI');
  });

  test('12. médico NO puede crear tipo EVALUACION_PSICOLOGICA', async () => {
    setCallerAsMedico('user_medico_123');
    const result = await createSeguimiento({
      ...validData,
      tipoSeguimiento: 'EVALUACION_PSICOLOGICA',
      datosEspecificos: { tipo: 'EVALUACION_PSICOLOGICA', datos: {} },
    });
    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toContain('medico');
  });

  test('13. psicólogo NO puede crear tipo TRAUMATOLOGIA', async () => {
    setCallerAsPsicologo('user_psicologo_123');
    const result = await createSeguimiento({
      ...validData,
      tipoSeguimiento: 'TRAUMATOLOGIA',
      datosEspecificos: { tipo: 'TRAUMATOLOGIA', datos: {} },
    });
    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toContain('psicologo');
  });

  test('14. cardiólogo puede crear tipo EVALUACION_CARDIOLOGICA', async () => {
    setCallerAsCardiologo('user_cardiologo_123');
    const result = await createSeguimiento({
      ...validData,
      tipoSeguimiento: 'EVALUACION_CARDIOLOGICA',
      datosEspecificos: {
        tipo: 'EVALUACION_CARDIOLOGICA',
        datos: { ecg: 'Normal', diagnostico: 'Sin hallazgos' },
      },
    });
    expect(result.success).toBe(true);
    const tx = getMockTx();
    expect(tx.seguimientoEvaluacionCardiologica.create).toHaveBeenCalled();
  });

  test('15. admin puede crear cualquier tipo', async () => {
    setCallerAsAdmin('user_admin_456');
    const result = await createSeguimiento({
      ...validData,
      tipoSeguimiento: 'EVALUACION_PSICOLOGICA',
      datosEspecificos: { tipo: 'EVALUACION_PSICOLOGICA', datos: {} },
    });
    expect(result.success).toBe(true);
  });
});

// ─── updateSeguimiento ────────────────────────────────────────────────────────

describe('updateSeguimiento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCallerAsMedico('user_medico_123');
    mockPrisma.seguimiento.findUnique.mockResolvedValue({
      id: 'existing-id',
      profesionalId: 'user_medico_123',
      tipoSeguimiento: null,
    });
    const tx = getMockTx();
    tx.seguimiento.update.mockResolvedValue({ id: 'existing-id' });
    tx.seguimientoTraumatologia.upsert.mockResolvedValue({});
    tx.seguimientoHistoriaClinica.upsert.mockResolvedValue({});
    tx.seguimientoEvaluacionPsicologica.upsert.mockResolvedValue({});
    tx.seguimientoEvaluacionCardiologica.upsert.mockResolvedValue({});
    tx.seguimientoTraumatologia.deleteMany.mockResolvedValue({});
    tx.seguimientoHistoriaClinica.deleteMany.mockResolvedValue({});
    tx.seguimientoEvaluacionPsicologica.deleteMany.mockResolvedValue({});
    tx.seguimientoEvaluacionCardiologica.deleteMany.mockResolvedValue({});
    mockPrisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(tx),
    );
  });

  test('16. rechaza si el llamante es profesional y NO es el dueño', async () => {
    setCallerAsMedico('user_otro_medico_999');
    mockPrisma.seguimiento.findUnique.mockResolvedValue({
      id: 'existing-id',
      profesionalId: 'user_medico_123',
      tipoSeguimiento: null,
    });
    const result = await updateSeguimiento('existing-id', validData);
    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toContain('No autorizado');
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  test('17. éxito si el llamante es el dueño del seguimiento', async () => {
    setCallerAsMedico('user_medico_123');
    const result = await updateSeguimiento('existing-id', validData);
    expect(result.success).toBe(true);
    const tx = getMockTx();
    expect(tx.seguimiento.update).toHaveBeenCalled();
  });

  test('18. upsert satélite en update con tipo TRAUMATOLOGIA', async () => {
    setCallerAsMedico('user_medico_123');
    const result = await updateSeguimiento('existing-id', {
      ...validData,
      tipoSeguimiento: 'TRAUMATOLOGIA',
      datosEspecificos: { tipo: 'TRAUMATOLOGIA', datos: { postura: 'Escoliosis' } },
    });
    expect(result.success).toBe(true);
    const tx = getMockTx();
    expect(tx.seguimientoTraumatologia.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { seguimientoId: 'existing-id' },
        update: expect.objectContaining({ postura: 'Escoliosis' }),
      }),
    );
  });

  test('19. cambio de tipo elimina satélite anterior y crea el nuevo', async () => {
    setCallerAsMedico('user_medico_123');
    mockPrisma.seguimiento.findUnique.mockResolvedValue({
      id: 'existing-id',
      profesionalId: 'user_medico_123',
      tipoSeguimiento: 'TRAUMATOLOGIA',
    });
    const result = await updateSeguimiento('existing-id', {
      ...validData,
      tipoSeguimiento: 'HISTORIA_CLINICA',
      datosEspecificos: { tipo: 'HISTORIA_CLINICA', datos: { diagnostico: 'Sin hallazgos' } },
    });
    expect(result.success).toBe(true);
    const tx = getMockTx();
    expect(tx.seguimientoTraumatologia.deleteMany).toHaveBeenCalledWith({
      where: { seguimientoId: 'existing-id' },
    });
    expect(tx.seguimientoHistoriaClinica.upsert).toHaveBeenCalled();
  });
});

// ─── deleteSeguimiento ────────────────────────────────────────────────────────

describe('deleteSeguimiento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.seguimiento.findUnique.mockResolvedValue({
      id: 'existing-id',
      profesionalId: 'user_medico_123',
      tipoSeguimiento: null,
    });
    mockPrisma.seguimiento.delete.mockResolvedValue({ id: 'deleted-id' });
  });

  test('20. rechaza si el llamante es profesional de salud y NO es el dueño', async () => {
    setCallerAsMedico('user_otro_medico_999');
    const result = await deleteSeguimiento('existing-id');
    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toContain('No autorizado');
    expect(mockPrisma.seguimiento.delete).not.toHaveBeenCalled();
  });

  test('21. éxito si es admin aunque NO sea el dueño (ownership bypass for admin)', async () => {
    setCallerAsAdmin('user_admin_456');
    mockPrisma.seguimiento.findUnique.mockResolvedValue({
      id: 'existing-id',
      profesionalId: 'user_medico_123',
      tipoSeguimiento: null,
    });
    const result = await deleteSeguimiento('existing-id');
    expect(result.success).toBe(true);
    expect(mockPrisma.seguimiento.delete).toHaveBeenCalledWith({ where: { id: 'existing-id' } });
  });

  test('22. éxito si es el dueño aunque no sea admin', async () => {
    setCallerAsMedico('user_medico_123');
    mockPrisma.seguimiento.findUnique.mockResolvedValue({
      id: 'existing-id',
      profesionalId: 'user_medico_123',
      tipoSeguimiento: null,
    });
    const result = await deleteSeguimiento('existing-id');
    expect(result.success).toBe(true);
    expect(mockPrisma.seguimiento.delete).toHaveBeenCalledWith({ where: { id: 'existing-id' } });
  });
});
