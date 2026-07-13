import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  currentUser: vi.fn().mockResolvedValue({ publicMetadata: { role: 'admin' } }),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    deportista: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    clubAnterior: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    datosEscolares: { upsert: vi.fn() },
    datosSociales: { upsert: vi.fn() },
    datosFamiliares: { upsert: vi.fn() },
    viviendaFamiliar: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    servicioVivienda: { deleteMany: vi.fn() },
    necesidadesApoyo: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    apoyoRequerido: { deleteMany: vi.fn() },
  },
}));

import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { GET, PATCH, DELETE } from '../[id]/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(url: string, options?: RequestInit) {
  return new Request(url, options);
}

const mockDeportistaFull = {
  id: 'cuid1',
  nombre: 'Juan',
  apellido: 'Perez',
  dni: '12345678',
  fechaNacimiento: new Date('2000-01-01'),
  provincia: null,
  ciudad: null,
  genero: null,
  telefono: null,
  email: null,
  domicilioActual: null,
  nacionalidad: null,
  contactoEmergencia: null,
  vivePensionClub: false,
  vivePensionExterna: false,
  observaciones: null,
  disciplina: 'FUTBOL',
  categoria: 'PRIMERA',
  posicion: null,
  estado: 'ACTIVO',
  actividadComplementaria: null,
  fechaIngreso: new Date('2023-01-01'),
  esRepresentante: false,
  clubesAnteriores: [],
  historiaDeportiva: [],
  datosEscolares: null,
  datosSociales: null,
  viviendaFamiliar: null,
  datosFamiliares: null,
  necesidadesApoyo: null,
};

// ---------------------------------------------------------------------------
// GET /api/deportistas/[id]
// ---------------------------------------------------------------------------

describe('GET /api/deportistas/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);

    const res = await GET(makeRequest('http://localhost/api/deportistas/cuid1'), makeParams('cuid1'));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.errors[0].status).toBe('401');
  });

  it('returns 404 for unknown id', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user1' } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    vi.mocked(prisma.deportista.findUnique).mockResolvedValue(null);

    const res = await GET(makeRequest('http://localhost/api/deportistas/nonexistent'), makeParams('nonexistent'));

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.errors[0].status).toBe('404');
  });

  it('returns 200 with JSON:API single shape', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user1' } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    vi.mocked(prisma.deportista.findUnique).mockResolvedValue(mockDeportistaFull as never);

    const res = await GET(makeRequest('http://localhost/api/deportistas/cuid1'), makeParams('cuid1'));

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/vnd.api+json');
    const body = await res.json();
    expect(body.data.type).toBe('deportistas');
    expect(body.data.id).toBe('cuid1');
    expect(body.data.attributes.apellido).toBe('Perez');
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/deportistas/[id]
// ---------------------------------------------------------------------------

describe('PATCH /api/deportistas/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  const validPatchBody = {
    data: {
      type: 'deportistas',
      id: 'cuid1',
      attributes: {
        apellido: 'Garcia',
      },
    },
  };

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);

    const res = await PATCH(
      makeRequest('http://localhost/api/deportistas/cuid1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/vnd.api+json' },
        body: JSON.stringify(validPatchBody),
      }),
      makeParams('cuid1'),
    );

    expect(res.status).toBe(401);
  });

  it('returns 404 for unknown id', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user1' } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    vi.mocked(prisma.deportista.findUnique).mockResolvedValue(null);

    const body = {
      data: { type: 'deportistas', id: 'nonexistent', attributes: { apellido: 'Test' } },
    };

    const res = await PATCH(
      makeRequest('http://localhost/api/deportistas/nonexistent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/vnd.api+json' },
        body: JSON.stringify(body),
      }),
      makeParams('nonexistent'),
    );

    expect(res.status).toBe(404);
  });

  it('returns 200 with updated data', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user1' } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    vi.mocked(prisma.deportista.findUnique)
      .mockResolvedValueOnce({ id: 'cuid1' } as never) // existence check
      .mockResolvedValueOnce({ ...mockDeportistaFull, apellido: 'Garcia' } as never); // final fetch
    vi.mocked(prisma.deportista.update).mockResolvedValue({} as never);

    const res = await PATCH(
      makeRequest('http://localhost/api/deportistas/cuid1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/vnd.api+json' },
        body: JSON.stringify(validPatchBody),
      }),
      makeParams('cuid1'),
    );

    expect(res.status).toBe(200);
    const resBody = await res.json();
    expect(resBody.data.type).toBe('deportistas');
    expect(resBody.data.attributes.apellido).toBe('Garcia');
  });

  it('returns 409 when body id does not match URL id', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user1' } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);

    const body = {
      data: { type: 'deportistas', id: 'different-id', attributes: { apellido: 'Test' } },
    };

    const res = await PATCH(
      makeRequest('http://localhost/api/deportistas/cuid1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/vnd.api+json' },
        body: JSON.stringify(body),
      }),
      makeParams('cuid1'),
    );

    expect(res.status).toBe(409);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/deportistas/[id]
// ---------------------------------------------------------------------------

describe('DELETE /api/deportistas/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);

    const res = await DELETE(makeRequest('http://localhost/api/deportistas/cuid1'), makeParams('cuid1'));

    expect(res.status).toBe(401);
  });

  it('returns 404 for unknown id', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user1' } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    vi.mocked(prisma.deportista.findUnique).mockResolvedValue(null);

    const res = await DELETE(makeRequest('http://localhost/api/deportistas/nonexistent'), makeParams('nonexistent'));

    expect(res.status).toBe(404);
  });

  it('returns 204 when deletion succeeds', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user1' } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    vi.mocked(prisma.deportista.findUnique).mockResolvedValue({ id: 'cuid1' } as never);
    vi.mocked(prisma.deportista.delete).mockResolvedValue({} as never);

    const res = await DELETE(makeRequest('http://localhost/api/deportistas/cuid1'), makeParams('cuid1'));

    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
  });
});
