import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/queries/deportistas', () => ({
  getDeportistas: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    deportista: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    clubAnterior: { createMany: vi.fn() },
    datosEscolares: { create: vi.fn() },
    datosSociales: { create: vi.fn() },
    datosFamiliares: { create: vi.fn() },
    viviendaFamiliar: { create: vi.fn() },
    necesidadesApoyo: { create: vi.fn() },
  },
}));

import { auth } from '@clerk/nextjs/server';
import { getDeportistas } from '@/lib/queries/deportistas';
import { prisma } from '@/lib/db';
import { GET, POST } from '../route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(url: string, options?: RequestInit) {
  return new Request(url, options);
}

const mockDeportistaListItem = {
  id: 'cuid1',
  nombre: 'Juan',
  apellido: 'Perez',
  dni: '12345678',
  disciplinaId: 'disc-futbol',
  disciplina: { id: 'disc-futbol', nombre: 'Fútbol' },
  categoriaId: 'cat-primera',
  categoria: { id: 'cat-primera', nombre: 'Primera' },
  estado: 'ACTIVO',
  fechaIngreso: new Date('2023-01-01'),
};

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
  disciplinaId: 'disc-futbol',
  disciplina: { id: 'disc-futbol', nombre: 'Fútbol' },
  categoriaId: 'cat-primera',
  categoria: { id: 'cat-primera', nombre: 'Primera' },
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
// GET /api/deportistas
// ---------------------------------------------------------------------------

describe('GET /api/deportistas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);

    const req = makeRequest('http://localhost/api/deportistas');
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.errors[0].status).toBe('401');
    expect(res.headers.get('Content-Type')).toBe('application/vnd.api+json');
  });

  it('returns 200 with JSON:API collection shape when authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user1' } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    vi.mocked(getDeportistas).mockResolvedValue({
      deportistas: [mockDeportistaListItem],
      total: 1,
      page: 1,
      pageSize: 20,
    });

    const req = makeRequest('http://localhost/api/deportistas');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/vnd.api+json');
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].type).toBe('deportistas');
    expect(body.data[0].id).toBe('cuid1');
    expect(body.data[0].attributes.apellido).toBe('Perez');
    expect(body.data[0].attributes.categoriaId).toBe('cat-primera');
    expect(body.data[0].attributes.categoria).toEqual({ id: 'cat-primera', nombre: 'Primera' });
    // Disciplina se serializa como objeto {id,nombre} + disciplinaId (ya no un string enum).
    expect(body.data[0].attributes.disciplinaId).toBe('disc-futbol');
    expect(body.data[0].attributes.disciplina).toEqual({ id: 'disc-futbol', nombre: 'Fútbol' });
    expect(body.meta.total).toBe(1);
    expect(body.links).toBeDefined();
    expect(body.links.self).toBeDefined();
    expect(body.links.first).toBeDefined();
    expect(body.links.last).toBeDefined();
  });

  it('applies filter[search] param', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user1' } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    vi.mocked(getDeportistas).mockResolvedValue({
      deportistas: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });

    const req = makeRequest('http://localhost/api/deportistas?filter%5Bsearch%5D=Juan');
    await GET(req);

    expect(getDeportistas).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'Juan' }),
    );
  });

  it('applies filter[categoriaId] param', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user1' } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    vi.mocked(getDeportistas).mockResolvedValue({
      deportistas: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });

    const req = makeRequest('http://localhost/api/deportistas?filter%5BcategoriaId%5D=cat-primera');
    await GET(req);

    expect(getDeportistas).toHaveBeenCalledWith(
      expect.objectContaining({ categoriaId: 'cat-primera' }),
    );
  });

  it('applies filter[disciplina] param as disciplinaId', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user1' } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    vi.mocked(getDeportistas).mockResolvedValue({
      deportistas: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });

    // El filtro de disciplina ahora recibe un disciplinaId (cuid), no el enum viejo.
    const req = makeRequest('http://localhost/api/deportistas?filter%5Bdisciplina%5D=disc-futbol');
    await GET(req);

    expect(getDeportistas).toHaveBeenCalledWith(
      expect.objectContaining({ disciplinaId: 'disc-futbol' }),
    );
  });

  it('applies page[number] and page[size] params', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user1' } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    vi.mocked(getDeportistas).mockResolvedValue({
      deportistas: [],
      total: 50,
      page: 2,
      pageSize: 10,
    });

    const req = makeRequest(
      'http://localhost/api/deportistas?page%5Bnumber%5D=2&page%5Bsize%5D=10',
    );
    await GET(req);

    expect(getDeportistas).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, pageSize: 10 }),
    );
  });

  it('includes prev/next links when paginating', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user1' } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    vi.mocked(getDeportistas).mockResolvedValue({
      deportistas: [mockDeportistaListItem],
      total: 50,
      page: 2,
      pageSize: 20,
    });

    const req = makeRequest(
      'http://localhost/api/deportistas?page%5Bnumber%5D=2&page%5Bsize%5D=20',
    );
    const res = await GET(req);
    const body = await res.json();

    expect(body.links.prev).toContain('page%5Bnumber%5D=1');
    expect(body.links.next).toContain('page%5Bnumber%5D=3');
  });
});

// ---------------------------------------------------------------------------
// POST /api/deportistas
// ---------------------------------------------------------------------------

const validBody = {
  data: {
    type: 'deportistas',
    attributes: {
      apellido: 'Perez',
      nombre: 'Juan',
      dni: '12345678',
      fechaNacimiento: '2000-01-01',
      estado: 'ACTIVO',
      disciplinaId: 'disc-futbol',
      categoriaId: 'cat-primera',
      vivePensionClub: false,
      vivePensionExterna: false,
      esRepresentante: false,
      clubesAnteriores: [],
    },
  },
};

describe('POST /api/deportistas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);

    const req = makeRequest('http://localhost/api/deportistas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/vnd.api+json' },
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('returns 415 when Content-Type is wrong', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user1' } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);

    const req = makeRequest('http://localhost/api/deportistas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);

    expect(res.status).toBe(415);
  });

  it('returns 422 with errors array when apellido is missing', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user1' } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);

    const body = {
      data: {
        type: 'deportistas',
        attributes: {
          nombre: 'Juan',
          dni: '12345678',
          fechaNacimiento: '2000-01-01',
          estado: 'ACTIVO',
        },
      },
    };

    const req = makeRequest('http://localhost/api/deportistas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/vnd.api+json' },
      body: JSON.stringify(body),
    });
    const res = await POST(req);

    expect(res.status).toBe(422);
    const resBody = await res.json();
    expect(resBody.errors).toBeDefined();
    expect(resBody.errors.length).toBeGreaterThan(0);
    const apelError = resBody.errors.find(
      (e: { source?: { pointer: string } }) =>
        e.source?.pointer?.includes('apellido'),
    );
    expect(apelError).toBeDefined();
  });

  it('returns 201 with Location header and JSON:API single shape', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user1' } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    vi.mocked(prisma.deportista.create).mockResolvedValue({
      id: 'newcuid',
      ...mockDeportistaFull,
    } as never);
    vi.mocked(prisma.deportista.findUnique).mockResolvedValue(mockDeportistaFull as never);

    const req = makeRequest('http://localhost/api/deportistas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/vnd.api+json' },
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(res.headers.get('Location')).toContain('/api/deportistas/');
    expect(res.headers.get('Content-Type')).toBe('application/vnd.api+json');
    const resBody = await res.json();
    expect(resBody.data.type).toBe('deportistas');
    expect(resBody.data.id).toBeDefined();
    expect(resBody.data.attributes.categoria).toEqual({ id: 'cat-primera', nombre: 'Primera' });
    expect(resBody.data.attributes.disciplina).toEqual({ id: 'disc-futbol', nombre: 'Fútbol' });
    expect(resBody.data.attributes.disciplinaId).toBe('disc-futbol');
    expect(prisma.deportista.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          categoriaId: 'cat-primera',
          disciplinaId: 'disc-futbol',
        }),
      }),
    );
  });
});
