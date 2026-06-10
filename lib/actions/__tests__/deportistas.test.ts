import { describe, test, expect, vi, beforeEach } from 'vitest';

// All mocks must be hoisted before vi.mock calls
const { mockAuth, mockRevalidatePath, mockPrisma } = vi.hoisted(() => {
  const mockAuth = vi.fn().mockResolvedValue({ userId: 'user_test_123' });
  const mockRevalidatePath = vi.fn();
  const mockPrisma = {
    deportista: {
      create: vi.fn().mockResolvedValue({ id: 'new-deportista-id' }),
      update: vi.fn().mockResolvedValue({ id: 'existing-id' }),
      delete: vi.fn().mockResolvedValue({ id: 'deleted-id' }),
      findUnique: vi.fn().mockResolvedValue({ id: 'existing-id', apellido: 'García' }),
    },
    clubAnterior: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    datosEscolares: {
      create: vi.fn().mockResolvedValue({ id: 'esc-id' }),
      upsert: vi.fn().mockResolvedValue({ id: 'esc-id' }),
    },
    datosSociales: {
      upsert: vi.fn().mockResolvedValue({ id: 'soc-id' }),
    },
    datosFamiliares: {
      upsert: vi.fn().mockResolvedValue({ id: 'fam-id' }),
    },
    viviendaFamiliar: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'viv-id' }),
      update: vi.fn().mockResolvedValue({ id: 'viv-id' }),
    },
    servicioVivienda: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    necesidadesApoyo: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'nec-id' }),
      update: vi.fn().mockResolvedValue({ id: 'nec-id' }),
    },
    apoyoRequerido: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  return { mockAuth, mockRevalidatePath, mockPrisma };
});

vi.mock('@clerk/nextjs/server', () => ({ auth: mockAuth }));
vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));

import { createDeportista, updateDeportista, deleteDeportista } from '../deportistas';
import type { DeportistaFormData } from '@/lib/types/deportistas';

const validMinimalData: DeportistaFormData = {
  apellido: 'García',
  nombre: 'Juan',
  dni: '12345678',
  fechaNacimiento: '2000-01-01',
  vivePensionClub: false,
  vivePensionExterna: false,
  estado: 'ACTIVO',
  esRepresentante: false,
  clubesAnteriores: [],
};

describe('createDeportista', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user_test_123' });
    mockPrisma.deportista.create.mockResolvedValue({ id: 'new-deportista-id' });
    mockPrisma.datosEscolares.create.mockResolvedValue({ id: 'esc-id' });
    mockPrisma.clubAnterior.createMany.mockResolvedValue({ count: 1 });
  });

  test('retorna error si userId es null', async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });
    const result = await createDeportista(validMinimalData);
    expect(result).toEqual({ success: false, error: 'No autorizado' });
  });

  test('retorna error si falta apellido', async () => {
    const result = await createDeportista({ ...validMinimalData, apellido: '' });
    expect(result).toEqual({ success: false, error: 'El apellido es requerido' });
  });

  test('retorna error si falta nombre', async () => {
    const result = await createDeportista({ ...validMinimalData, nombre: '' });
    expect(result).toEqual({ success: false, error: 'El nombre es requerido' });
  });

  test('retorna error si falta DNI', async () => {
    const result = await createDeportista({ ...validMinimalData, dni: '' });
    expect(result).toEqual({ success: false, error: 'El DNI es requerido' });
  });

  test('retorna error si falta fechaNacimiento', async () => {
    const result = await createDeportista({ ...validMinimalData, fechaNacimiento: '' });
    expect(result).toEqual({ success: false, error: 'La fecha de nacimiento es requerida' });
  });

  test('llama prisma.deportista.create con datos mínimos válidos y retorna success', async () => {
    const result = await createDeportista(validMinimalData);
    expect(result.success).toBe(true);
    expect(mockPrisma.deportista.create).toHaveBeenCalled();
  });

  test('incluye creación de datosEscolares cuando se proveen', async () => {
    const dataWithEscolar: DeportistaFormData = {
      ...validMinimalData,
      datosEscolares: {
        nivelEstudio: 'SECUNDARIO_COMPLETO',
        nombreColegio: 'Escuela Nacional',
      },
    };
    await createDeportista(dataWithEscolar);
    expect(mockPrisma.datosEscolares.create).toHaveBeenCalled();
  });

  test('incluye creación de clubesAnteriores cuando se proveen', async () => {
    const dataWithClubes: DeportistaFormData = {
      ...validMinimalData,
      clubesAnteriores: [{ nombre: 'Club Anterior', periodo: '2018-2020' }],
    };
    await createDeportista(dataWithClubes);
    expect(mockPrisma.clubAnterior.createMany).toHaveBeenCalled();
  });
});

describe('updateDeportista', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user_test_123' });
    mockPrisma.deportista.findUnique.mockResolvedValue({ id: 'existing-id' });
    mockPrisma.deportista.update.mockResolvedValue({ id: 'existing-id' });
    mockPrisma.clubAnterior.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.datosEscolares.upsert.mockResolvedValue({ id: 'esc-id' });
  });

  test('retorna error si userId es null', async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });
    const result = await updateDeportista('existing-id', validMinimalData);
    expect(result).toEqual({ success: false, error: 'No autorizado' });
  });

  test('llama prisma.deportista.update con los campos del payload', async () => {
    const result = await updateDeportista('existing-id', validMinimalData);
    expect(result.success).toBe(true);
    expect(mockPrisma.deportista.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'existing-id' },
        data: expect.objectContaining({ apellido: 'García', nombre: 'Juan' }),
      }),
    );
  });

  test('upserta datosEscolares cuando se incluyen en el payload', async () => {
    const dataWithEscolar: DeportistaFormData = {
      ...validMinimalData,
      datosEscolares: { nivelEstudio: 'PRIMARIO_COMPLETO' },
    };
    await updateDeportista('existing-id', dataWithEscolar);
    expect(mockPrisma.datosEscolares.upsert).toHaveBeenCalled();
  });
});

describe('deleteDeportista', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user_test_123' });
    mockPrisma.deportista.delete.mockResolvedValue({ id: 'deleted-id' });
  });

  test('retorna error si userId es null', async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });
    const result = await deleteDeportista('some-id');
    expect(result).toEqual({ success: false, error: 'No autorizado' });
  });

  test('llama prisma.deportista.delete con el id correcto', async () => {
    const result = await deleteDeportista('delete-me-id');
    expect(result.success).toBe(true);
    expect(mockPrisma.deportista.delete).toHaveBeenCalledWith({ where: { id: 'delete-me-id' } });
  });

  test('llama revalidatePath con /deportistas', async () => {
    await deleteDeportista('delete-me-id');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/deportistas');
  });
});
