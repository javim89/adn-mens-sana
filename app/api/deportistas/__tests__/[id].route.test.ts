import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/tenant/contexto', async () =>
  (await import('@/test-utils/tenant')).moduloContextoMock(),
);

vi.mock('@/lib/s3', async () => {
  const actual = await vi.importActual<typeof import('@/lib/s3')>('@/lib/s3');
  return {
    isValidFotoKey: actual.isValidFotoKey,
    keyEsDelClub: actual.keyEsDelClub,
    getFotoUrl: vi.fn(async (key: string | null) => (key ? `https://signed.example/${key}` : null)),
    deleteFoto: vi.fn(),
    fotoExiste: vi.fn(),
  };
});

vi.mock('@/lib/db', () => ({
  prisma: {
    deportista: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
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

// El route usa el cliente del club; `foto-deportista` (ownership global de la
// key) sigue usando el base. Los dos apuntan al mismo objeto de mocks.
vi.mock('@/lib/tenant/db', async () =>
  (await import('@/test-utils/tenant')).moduloDbMock((await import('@/lib/db')).prisma),
);

import { prisma } from '@/lib/db';
import { deleteFoto, fotoExiste } from '@/lib/s3';
import { GET, PATCH, DELETE } from '../[id]/route';
import { CLUB_TEST, mockContexto, setContexto } from '@/test-utils/tenant';

const OLD_KEY = 'deportistas/11111111-1111-1111-1111-111111111111.jpg';
// La foto vieja puede ser legacy; la nueva siempre es una subida del club de la sesión.
const NEW_KEY = `clubes/${CLUB_TEST.id}/deportistas/22222222-2222-2222-2222-222222222222.png`;

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
  disciplinaId: 'disc-futbol',
  disciplina: { id: 'disc-futbol', nombre: 'Fútbol' },
  categoriaId: 'cat-primera',
  categoria: { id: 'cat-primera', nombre: 'Primera' },
  posicion: null,
  estado: 'ACTIVO',
  actividadComplementaria: null,
  fechaIngreso: new Date('2023-01-01'),
  tieneRepresentante: false,
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
    setContexto(null);

    const res = await GET(makeRequest('http://localhost/api/deportistas/cuid1'), makeParams('cuid1'));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.errors[0].status).toBe('401');
  });

  it('returns 404 for unknown id', async () => {
    setContexto(mockContexto('admin', { userId: 'user1' }));
    vi.mocked(prisma.deportista.findUnique).mockResolvedValue(null);

    const res = await GET(makeRequest('http://localhost/api/deportistas/nonexistent'), makeParams('nonexistent'));

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.errors[0].status).toBe('404');
  });

  it('returns 200 with JSON:API single shape', async () => {
    setContexto(mockContexto('admin', { userId: 'user1' }));
    vi.mocked(prisma.deportista.findUnique).mockResolvedValue(mockDeportistaFull as never);

    const res = await GET(makeRequest('http://localhost/api/deportistas/cuid1'), makeParams('cuid1'));

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/vnd.api+json');
    const body = await res.json();
    expect(body.data.type).toBe('deportistas');
    expect(body.data.id).toBe('cuid1');
    expect(body.data.attributes.apellido).toBe('Perez');
    // Disciplina se serializa como objeto {id,nombre} + disciplinaId.
    expect(body.data.attributes.disciplinaId).toBe('disc-futbol');
    expect(body.data.attributes.disciplina).toEqual({ id: 'disc-futbol', nombre: 'Fútbol' });
  });

  it('exposes fotoKey and a signed fotoUrl', async () => {
    setContexto(mockContexto('admin', { userId: 'user1' }));
    vi.mocked(prisma.deportista.findUnique).mockResolvedValue({ ...mockDeportistaFull, fotoKey: OLD_KEY } as never);

    const res = await GET(makeRequest('http://localhost/api/deportistas/cuid1'), makeParams('cuid1'));

    const body = await res.json();
    expect(body.data.attributes.fotoKey).toBe(OLD_KEY);
    expect(body.data.attributes.fotoUrl).toBe(`https://signed.example/${OLD_KEY}`);
  });

  it('returns fotoKey and fotoUrl null when there is no foto', async () => {
    setContexto(mockContexto('admin', { userId: 'user1' }));
    vi.mocked(prisma.deportista.findUnique).mockResolvedValue({ ...mockDeportistaFull, fotoKey: null } as never);

    const res = await GET(makeRequest('http://localhost/api/deportistas/cuid1'), makeParams('cuid1'));

    const body = await res.json();
    expect(body.data.attributes.fotoKey).toBeNull();
    expect(body.data.attributes.fotoUrl).toBeNull();
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
    setContexto(null);

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
    setContexto(mockContexto('admin', { userId: 'user1' }));
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
    setContexto(mockContexto('admin', { userId: 'user1' }));
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
    expect(resBody.data.attributes.categoria).toEqual({ id: 'cat-primera', nombre: 'Primera' });
  });

  it('updates categoriaId', async () => {
    setContexto(mockContexto('admin', { userId: 'user1' }));
    vi.mocked(prisma.deportista.findUnique)
      .mockResolvedValueOnce({ id: 'cuid1' } as never)
      .mockResolvedValueOnce(mockDeportistaFull as never);
    vi.mocked(prisma.deportista.update).mockResolvedValue({} as never);

    const body = {
      data: { type: 'deportistas', id: 'cuid1', attributes: { categoriaId: 'cat-reserva' } },
    };

    const res = await PATCH(
      makeRequest('http://localhost/api/deportistas/cuid1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/vnd.api+json' },
        body: JSON.stringify(body),
      }),
      makeParams('cuid1'),
    );

    expect(res.status).toBe(200);
    expect(prisma.deportista.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ categoriaId: 'cat-reserva' }),
      }),
    );
  });

  it('updates disciplinaId', async () => {
    setContexto(mockContexto('admin', { userId: 'user1' }));
    vi.mocked(prisma.deportista.findUnique)
      .mockResolvedValueOnce({ id: 'cuid1' } as never)
      .mockResolvedValueOnce({
        ...mockDeportistaFull,
        disciplinaId: 'disc-basquet',
        disciplina: { id: 'disc-basquet', nombre: 'Básquet' },
      } as never);
    vi.mocked(prisma.deportista.update).mockResolvedValue({} as never);

    const body = {
      data: { type: 'deportistas', id: 'cuid1', attributes: { disciplinaId: 'disc-basquet' } },
    };

    const res = await PATCH(
      makeRequest('http://localhost/api/deportistas/cuid1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/vnd.api+json' },
        body: JSON.stringify(body),
      }),
      makeParams('cuid1'),
    );

    expect(res.status).toBe(200);
    expect(prisma.deportista.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ disciplinaId: 'disc-basquet' }),
      }),
    );
    const resBody = await res.json();
    expect(resBody.data.attributes.disciplina).toEqual({ id: 'disc-basquet', nombre: 'Básquet' });
  });

  it('clears categoriaId to null when empty string sent', async () => {
    setContexto(mockContexto('admin', { userId: 'user1' }));
    vi.mocked(prisma.deportista.findUnique)
      .mockResolvedValueOnce({ id: 'cuid1' } as never)
      .mockResolvedValueOnce({ ...mockDeportistaFull, categoriaId: null, categoria: null } as never);
    vi.mocked(prisma.deportista.update).mockResolvedValue({} as never);

    const body = {
      data: { type: 'deportistas', id: 'cuid1', attributes: { categoriaId: '' } },
    };

    const res = await PATCH(
      makeRequest('http://localhost/api/deportistas/cuid1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/vnd.api+json' },
        body: JSON.stringify(body),
      }),
      makeParams('cuid1'),
    );

    expect(res.status).toBe(200);
    expect(prisma.deportista.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ categoriaId: null }),
      }),
    );
    const resBody = await res.json();
    expect(resBody.data.attributes.categoria).toBeNull();
  });

  it('returns 409 when body id does not match URL id', async () => {
    setContexto(mockContexto('admin', { userId: 'user1' }));

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

  describe('fotoKey', () => {
    function patchFoto(fotoKey: string | null | undefined) {
      const attributes = fotoKey === undefined ? { apellido: 'Garcia' } : { fotoKey };
      return PATCH(
        makeRequest('http://localhost/api/deportistas/cuid1', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/vnd.api+json' },
          body: JSON.stringify({ data: { type: 'deportistas', id: 'cuid1', attributes } }),
        }),
        makeParams('cuid1'),
      );
    }

    beforeEach(() => {
      setContexto(mockContexto('admin', { userId: 'user1' }));
      vi.mocked(prisma.deportista.update).mockResolvedValue({} as never);
      vi.mocked(prisma.deportista.findFirst).mockResolvedValue(null);
      vi.mocked(fotoExiste).mockResolvedValue(true);
    });

    it('replaces the foto and deletes the old S3 object', async () => {
      vi.mocked(prisma.deportista.findUnique)
        .mockResolvedValueOnce({ id: 'cuid1', fotoKey: OLD_KEY } as never)
        .mockResolvedValueOnce({ ...mockDeportistaFull, fotoKey: NEW_KEY } as never);

      const res = await patchFoto(NEW_KEY);

      expect(res.status).toBe(200);
      expect(prisma.deportista.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ fotoKey: NEW_KEY }) }),
      );
      expect(deleteFoto).toHaveBeenCalledWith(OLD_KEY);
      const body = await res.json();
      expect(body.data.attributes.fotoUrl).toBe(`https://signed.example/${NEW_KEY}`);
    });

    it('removes the foto with null and deletes the old S3 object', async () => {
      vi.mocked(prisma.deportista.findUnique)
        .mockResolvedValueOnce({ id: 'cuid1', fotoKey: OLD_KEY } as never)
        .mockResolvedValueOnce({ ...mockDeportistaFull, fotoKey: null } as never);

      const res = await patchFoto(null);

      expect(res.status).toBe(200);
      expect(prisma.deportista.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ fotoKey: null }) }),
      );
      expect(deleteFoto).toHaveBeenCalledWith(OLD_KEY);
      const body = await res.json();
      expect(body.data.attributes.fotoUrl).toBeNull();
    });

    it('does not touch the foto when fotoKey is omitted', async () => {
      vi.mocked(prisma.deportista.findUnique)
        .mockResolvedValueOnce({ id: 'cuid1', fotoKey: OLD_KEY } as never)
        .mockResolvedValueOnce({ ...mockDeportistaFull, fotoKey: OLD_KEY } as never);

      const res = await patchFoto(undefined);

      expect(res.status).toBe(200);
      const updateArg = vi.mocked(prisma.deportista.update).mock.calls[0][0];
      expect(updateArg.data).not.toHaveProperty('fotoKey');
      expect(deleteFoto).not.toHaveBeenCalled();
    });

    it('does not delete anything when the same key is sent again', async () => {
      vi.mocked(prisma.deportista.findUnique)
        .mockResolvedValueOnce({ id: 'cuid1', fotoKey: OLD_KEY } as never)
        .mockResolvedValueOnce({ ...mockDeportistaFull, fotoKey: OLD_KEY } as never);

      const res = await patchFoto(OLD_KEY);

      expect(res.status).toBe(200);
      expect(deleteFoto).not.toHaveBeenCalled();
    });

    it('returns 422 for an invalid fotoKey', async () => {
      const res = await patchFoto('otros/hack.jpg');

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.errors[0].source.pointer).toBe('/data/attributes/fotoKey');
      expect(prisma.deportista.update).not.toHaveBeenCalled();
      expect(deleteFoto).not.toHaveBeenCalled();
    });

    it('checks ownership excluding the current deportista and existence in S3', async () => {
      vi.mocked(prisma.deportista.findUnique)
        .mockResolvedValueOnce({ id: 'cuid1', fotoKey: OLD_KEY } as never)
        .mockResolvedValueOnce({ ...mockDeportistaFull, fotoKey: NEW_KEY } as never);

      await patchFoto(NEW_KEY);

      expect(prisma.deportista.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { fotoKey: NEW_KEY, NOT: { id: 'cuid1' } } }),
      );
      expect(fotoExiste).toHaveBeenCalledWith(NEW_KEY);
    });

    it('returns 422 when another deportista already has the fotoKey, without deleting anything', async () => {
      vi.mocked(prisma.deportista.findUnique).mockResolvedValueOnce({ id: 'cuid1', fotoKey: OLD_KEY } as never);
      vi.mocked(prisma.deportista.findFirst).mockResolvedValue({ id: 'otro' } as never);

      const res = await patchFoto(NEW_KEY);

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.errors[0]).toMatchObject({
        source: { pointer: '/data/attributes/fotoKey' },
        detail: 'La foto ya está asignada a otro deportista',
      });
      expect(prisma.deportista.update).not.toHaveBeenCalled();
      expect(deleteFoto).not.toHaveBeenCalled();
    });

    it('returns 422 when the new fotoKey does not exist in S3', async () => {
      vi.mocked(prisma.deportista.findUnique).mockResolvedValueOnce({ id: 'cuid1', fotoKey: OLD_KEY } as never);
      vi.mocked(fotoExiste).mockResolvedValue(false);

      const res = await patchFoto(NEW_KEY);

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.errors[0].source.pointer).toBe('/data/attributes/fotoKey');
      expect(prisma.deportista.update).not.toHaveBeenCalled();
      expect(deleteFoto).not.toHaveBeenCalled();
    });

    it('rejects a new fotoKey from another club with 422, without touching S3 or the old foto', async () => {
      vi.mocked(prisma.deportista.findUnique).mockResolvedValueOnce({ id: 'cuid1', fotoKey: OLD_KEY } as never);

      const res = await patchFoto('clubes/club_otro/deportistas/33333333-3333-3333-3333-333333333333.jpg');

      expect(res.status).toBe(422);
      expect(fotoExiste).not.toHaveBeenCalled();
      expect(prisma.deportista.update).not.toHaveBeenCalled();
      expect(deleteFoto).not.toHaveBeenCalled();
    });

    it('a deportista of another club is a 404 (the scoped client does not see it)', async () => {
      vi.mocked(prisma.deportista.findUnique).mockResolvedValueOnce(null);

      const res = await patchFoto(NEW_KEY);

      expect(res.status).toBe(404);
      expect(prisma.deportista.update).not.toHaveBeenCalled();
    });

    it('maps a P2002 race on foto_key to 422 and keeps the old foto', async () => {
      vi.mocked(prisma.deportista.findUnique).mockResolvedValueOnce({ id: 'cuid1', fotoKey: OLD_KEY } as never);
      vi.mocked(prisma.deportista.update).mockRejectedValue(
        Object.assign(new Error('Unique constraint failed'), {
          code: 'P2002',
          meta: {
            modelName: 'Deportista',
            driverAdapterError: { cause: { kind: 'UniqueConstraintViolation', constraint: { fields: ['foto_key'] } } },
          },
        }),
      );

      const res = await patchFoto(NEW_KEY);

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.errors[0].source.pointer).toBe('/data/attributes/fotoKey');
      expect(deleteFoto).not.toHaveBeenCalled();
    });

    it('skips ownership and S3 checks when the same key is sent or the foto is removed', async () => {
      vi.mocked(prisma.deportista.findUnique)
        .mockResolvedValueOnce({ id: 'cuid1', fotoKey: OLD_KEY } as never)
        .mockResolvedValueOnce({ ...mockDeportistaFull, fotoKey: OLD_KEY } as never)
        .mockResolvedValueOnce({ id: 'cuid1', fotoKey: OLD_KEY } as never)
        .mockResolvedValueOnce({ ...mockDeportistaFull, fotoKey: null } as never);

      await patchFoto(OLD_KEY);
      await patchFoto(null);

      expect(prisma.deportista.findFirst).not.toHaveBeenCalled();
      expect(fotoExiste).not.toHaveBeenCalled();
    });

    it('ignores fotoKey for the social role', async () => {
      setContexto(mockContexto('social', { userId: 'user1' }));
      vi.mocked(prisma.deportista.findUnique)
        .mockResolvedValueOnce({ id: 'cuid1', fotoKey: OLD_KEY } as never)
        .mockResolvedValueOnce({ ...mockDeportistaFull, fotoKey: OLD_KEY } as never);

      const res = await patchFoto(NEW_KEY);

      expect(res.status).toBe(200);
      expect(prisma.deportista.update).not.toHaveBeenCalled();
      expect(deleteFoto).not.toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/deportistas/[id]
// ---------------------------------------------------------------------------

describe('DELETE /api/deportistas/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    setContexto(null);

    const res = await DELETE(makeRequest('http://localhost/api/deportistas/cuid1'), makeParams('cuid1'));

    expect(res.status).toBe(401);
  });

  it('returns 404 for unknown id', async () => {
    setContexto(mockContexto('admin', { userId: 'user1' }));
    vi.mocked(prisma.deportista.findUnique).mockResolvedValue(null);

    const res = await DELETE(makeRequest('http://localhost/api/deportistas/nonexistent'), makeParams('nonexistent'));

    expect(res.status).toBe(404);
  });

  it('returns 204 when deletion succeeds', async () => {
    setContexto(mockContexto('admin', { userId: 'user1' }));
    vi.mocked(prisma.deportista.findUnique).mockResolvedValue({ id: 'cuid1' } as never);
    vi.mocked(prisma.deportista.delete).mockResolvedValue({} as never);

    const res = await DELETE(makeRequest('http://localhost/api/deportistas/cuid1'), makeParams('cuid1'));

    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
  });

  it('deletes the foto from S3 after deleting the record', async () => {
    setContexto(mockContexto('admin', { userId: 'user1' }));
    vi.mocked(prisma.deportista.findUnique).mockResolvedValue({ id: 'cuid1', fotoKey: OLD_KEY } as never);
    vi.mocked(prisma.deportista.delete).mockResolvedValue({} as never);

    const res = await DELETE(makeRequest('http://localhost/api/deportistas/cuid1'), makeParams('cuid1'));

    expect(res.status).toBe(204);
    expect(deleteFoto).toHaveBeenCalledWith(OLD_KEY);
    expect(vi.mocked(prisma.deportista.delete).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(deleteFoto).mock.invocationCallOrder[0],
    );
  });

  it('does not call S3 when a 404 is returned', async () => {
    setContexto(mockContexto('admin', { userId: 'user1' }));
    vi.mocked(prisma.deportista.findUnique).mockResolvedValue(null);

    await DELETE(makeRequest('http://localhost/api/deportistas/nonexistent'), makeParams('nonexistent'));

    expect(deleteFoto).not.toHaveBeenCalled();
  });
});
