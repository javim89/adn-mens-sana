import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockAuth, mockCurrentUser, mockRevalidatePath, mockPrisma } = vi.hoisted(() => {
  const mockAuth = vi.fn();
  const mockCurrentUser = vi.fn();
  const mockRevalidatePath = vi.fn();

  const mockPrisma = {
    entregaComida: {
      create: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
    necesidadesApoyo: {
      findUnique: vi.fn(),
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
vi.mock('@/lib/queries/viandas', () => ({ getPlantelViandas: vi.fn() }));

import { marcarRetiro, desmarcarRetiro } from '../viandas';

/** 02:30 UTC del 15 = 23:30 ART del 14. El borde que rompe la cena. */
const MEDIANOCHE_CRUZADA = new Date('2026-03-15T02:30:00.000Z');

const CREADA = {
  lugar: 'SEDE',
  entregadoPor: 'user_1',
  createdAt: new Date('2026-03-15T02:30:00.000Z'),
};

function comoSesion(role: string, lugarRetiro?: string) {
  mockAuth.mockResolvedValue({ userId: 'user_1' });
  mockCurrentUser.mockResolvedValue({
    publicMetadata: lugarRetiro ? { role, lugarRetiro } : { role },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(MEDIANOCHE_CRUZADA);
  mockPrisma.entregaComida.create.mockResolvedValue(CREADA);
  mockPrisma.entregaComida.deleteMany.mockResolvedValue({ count: 1 });
  mockPrisma.necesidadesApoyo.findUnique.mockResolvedValue({
    recibeAlmuerzo: true,
    recibeCena: true,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('marcarRetiro — control de acceso', () => {
  test('sin sesión rechaza', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await marcarRetiro({ deportistaId: 'd1', comida: 'DESAYUNO' });
    expect(res.success).toBe(false);
    expect(mockPrisma.entregaComida.create).not.toHaveBeenCalled();
  });

  test.each(['entrenador', 'nutricionista', 'social', 'medico'])(
    'el rol %s no puede marcar',
    async (role) => {
      comoSesion(role);
      const res = await marcarRetiro({ deportistaId: 'd1', comida: 'DESAYUNO' });
      expect(res.success).toBe(false);
      expect(mockPrisma.entregaComida.create).not.toHaveBeenCalled();
    },
  );
});

describe('marcarRetiro — resolución del lugar', () => {
  test('un responsable sin lugar asignado no puede marcar', async () => {
    comoSesion('responsable_viandas');
    const res = await marcarRetiro({ deportistaId: 'd1', comida: 'DESAYUNO' });
    expect(res.success).toBe(false);
    expect(res.success === false && res.error).toMatch(/no tiene un lugar de retiro/i);
    expect(mockPrisma.entregaComida.create).not.toHaveBeenCalled();
  });

  // El test central del módulo: si el cliente pudiera elegir el lugar, la
  // trazabilidad por puesto no valdría nada.
  test('el lugar del responsable gana sobre el que manda el cliente', async () => {
    comoSesion('responsable_viandas', 'SEDE');
    await marcarRetiro({ deportistaId: 'd1', comida: 'DESAYUNO', lugar: 'BOSQUESITO' });
    expect(mockPrisma.entregaComida.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ lugar: 'SEDE' }) }),
    );
  });

  // Un lugar viejo o mal tipeado en el `publicMetadata` no puede llegar a la
  // columna enum: se trata igual que la ausencia de lugar.
  test('un lugar inválido en el metadata del responsable vale como no tenerlo', async () => {
    comoSesion('responsable_viandas', 'BOSQUE_CHICO');
    const res = await marcarRetiro({ deportistaId: 'd1', comida: 'DESAYUNO' });
    expect(res.success).toBe(false);
    expect(res.success === false && res.error).toMatch(/no tiene un lugar de retiro/i);
    expect(mockPrisma.entregaComida.create).not.toHaveBeenCalled();
  });

  test('el admin debe elegir un lugar', async () => {
    comoSesion('admin');
    const res = await marcarRetiro({ deportistaId: 'd1', comida: 'DESAYUNO' });
    expect(res.success).toBe(false);
    expect(res.success === false && res.error).toMatch(/elegí un lugar/i);
    expect(mockPrisma.entregaComida.create).not.toHaveBeenCalled();
  });

  test('el admin no puede mandar un lugar inexistente', async () => {
    comoSesion('admin');
    const res = await marcarRetiro({
      deportistaId: 'd1',
      comida: 'DESAYUNO',
      lugar: 'BOSQUE',
    });
    expect(res.success).toBe(false);
    expect(mockPrisma.entregaComida.create).not.toHaveBeenCalled();
  });

  test('el admin marca en el lugar que eligió', async () => {
    comoSesion('admin');
    await marcarRetiro({
      deportistaId: 'd1',
      comida: 'DESAYUNO',
      lugar: 'ESTANCIA_CHICA',
    });
    expect(mockPrisma.entregaComida.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lugar: 'ESTANCIA_CHICA' }),
      }),
    );
  });
});

describe('marcarRetiro — la fecha la pone el servidor', () => {
  // A las 23:30 ART ya es el día siguiente en UTC. Una cena marcada a esa hora
  // tiene que quedar registrada en el día local, no en el de UTC.
  test('a las 23:30 ART la cena se guarda en el día local', async () => {
    comoSesion('responsable_viandas', 'SEDE');
    const res = await marcarRetiro({ deportistaId: 'd1', comida: 'CENA' });

    expect(res.fecha).toBe('2026-03-14');
    const { data } = mockPrisma.entregaComida.create.mock.calls[0][0];
    expect(data.fecha.toISOString()).toBe('2026-03-14T00:00:00.000Z');
  });

  test('la fecha no se puede inyectar desde el cliente', async () => {
    comoSesion('responsable_viandas', 'SEDE');
    await marcarRetiro({
      deportistaId: 'd1',
      comida: 'DESAYUNO',
      // @ts-expect-error el tipo no admite fecha; el test comprueba que además se ignora
      fecha: '2020-01-01',
    });
    const { data } = mockPrisma.entregaComida.create.mock.calls[0][0];
    expect(data.fecha.toISOString()).toBe('2026-03-14T00:00:00.000Z');
  });
});

describe('marcarRetiro — la ficha no condiciona la entrega', () => {
  // La regresión: el responsable no podía registrar una cena porque en la ficha
  // figuraba que no la recibe. Los flags son informativos; lo que se registra es
  // lo que realmente se entregó, y el desvío se mira después en Insights.
  test.each(['ALMUERZO', 'CENA'])(
    '%s se registra aunque la ficha diga que no lo recibe',
    async (comida) => {
      comoSesion('responsable_viandas', 'SEDE');
      mockPrisma.necesidadesApoyo.findUnique.mockResolvedValue({
        recibeAlmuerzo: false,
        recibeCena: false,
      });
      const res = await marcarRetiro({ deportistaId: 'd1', comida });
      expect(res.success).toBe(true);
      expect(mockPrisma.entregaComida.create).toHaveBeenCalled();
    },
  );

  test('sin satélite de necesidades de apoyo (ficha incompleta) igual se registra', async () => {
    comoSesion('responsable_viandas', 'SEDE');
    mockPrisma.necesidadesApoyo.findUnique.mockResolvedValue(null);
    const res = await marcarRetiro({ deportistaId: 'd1', comida: 'ALMUERZO' });
    expect(res.success).toBe(true);
    expect(mockPrisma.entregaComida.create).toHaveBeenCalled();
  });

  test.each(['DESAYUNO', 'ALMUERZO', 'MERIENDA', 'CENA'])(
    '%s ni siquiera consulta el satélite: no hay nada que validar',
    async (comida) => {
      comoSesion('responsable_viandas', 'SEDE');
      await marcarRetiro({ deportistaId: 'd1', comida });
      expect(mockPrisma.necesidadesApoyo.findUnique).not.toHaveBeenCalled();
    },
  );

  test('una comida inexistente se rechaza', async () => {
    comoSesion('responsable_viandas', 'SEDE');
    const res = await marcarRetiro({ deportistaId: 'd1', comida: 'ONCE' });
    expect(res.success).toBe(false);
    expect(mockPrisma.entregaComida.create).not.toHaveBeenCalled();
  });
});

describe('marcarRetiro — el unique violado es la señal anti-fraude', () => {
  test('informa dónde y a qué hora ya retiró, y devuelve la entrega existente', async () => {
    comoSesion('responsable_viandas', 'BOSQUESITO');
    mockPrisma.entregaComida.create.mockRejectedValue({ code: 'P2002' });
    mockPrisma.entregaComida.findUnique.mockResolvedValue({
      lugar: 'SEDE',
      entregadoPor: 'user_otro',
      createdAt: new Date('2026-03-14T15:40:00.000Z'), // 12:40 ART
    });

    const res = await marcarRetiro({ deportistaId: 'd1', comida: 'ALMUERZO' });

    expect(res.success).toBe(false);
    expect(res.success === false && res.error).toContain('Sede');
    expect(res.success === false && res.error).toContain('12:40');
    // La UI adopta esta entrega en lugar de revertir el optimismo.
    expect(res.entrega).toEqual(
      expect.objectContaining({ lugar: 'SEDE', entregadoPor: 'user_otro' }),
    );
  });

  test('si la fila desapareció entre el create y la relectura, degrada con mensaje genérico', async () => {
    comoSesion('responsable_viandas', 'SEDE');
    mockPrisma.entregaComida.create.mockRejectedValue({ code: 'P2002' });
    mockPrisma.entregaComida.findUnique.mockResolvedValue(null);

    const res = await marcarRetiro({ deportistaId: 'd1', comida: 'ALMUERZO' });
    expect(res.success).toBe(false);
    expect(res.entrega).toBeUndefined();
  });

  test('un error de base que no sea P2002 no se confunde con un duplicado', async () => {
    comoSesion('responsable_viandas', 'SEDE');
    mockPrisma.entregaComida.create.mockRejectedValue(new Error('connection lost'));

    const res = await marcarRetiro({ deportistaId: 'd1', comida: 'DESAYUNO' });
    expect(res.success).toBe(false);
    expect(res.success === false && res.error).not.toMatch(/ya retiró/i);
  });
});

describe('desmarcarRetiro', () => {
  test('el responsable solo puede borrar entregas de su propio lugar', async () => {
    comoSesion('responsable_viandas', 'SEDE');
    await desmarcarRetiro({ deportistaId: 'd1', comida: 'ALMUERZO' });

    const { where } = mockPrisma.entregaComida.deleteMany.mock.calls[0][0];
    expect(where.lugar).toBe('SEDE');
    expect(where.fecha.toISOString()).toBe('2026-03-14T00:00:00.000Z');
  });

  test('el admin puede borrar en cualquier lugar', async () => {
    comoSesion('admin');
    await desmarcarRetiro({ deportistaId: 'd1', comida: 'ALMUERZO' });

    const { where } = mockPrisma.entregaComida.deleteMany.mock.calls[0][0];
    expect(where).not.toHaveProperty('lugar');
    expect(where.fecha.toISOString()).toBe('2026-03-14T00:00:00.000Z');
  });

  test('no borra nada de otro día: la fecha siempre es hoy', async () => {
    comoSesion('admin');
    await desmarcarRetiro({ deportistaId: 'd1', comida: 'CENA' });
    const { where } = mockPrisma.entregaComida.deleteMany.mock.calls[0][0];
    expect(where.fecha.toISOString()).toBe('2026-03-14T00:00:00.000Z');
  });

  test('count 0 devuelve un error explicativo', async () => {
    comoSesion('responsable_viandas', 'SEDE');
    mockPrisma.entregaComida.deleteMany.mockResolvedValue({ count: 0 });

    const res = await desmarcarRetiro({ deportistaId: 'd1', comida: 'ALMUERZO' });
    expect(res.success).toBe(false);
    expect(res.success === false && res.error).toMatch(/otro día|otro lugar|no existe/i);
  });

  test.each(['entrenador', 'social'])('el rol %s no puede desmarcar', async (role) => {
    comoSesion(role);
    const res = await desmarcarRetiro({ deportistaId: 'd1', comida: 'ALMUERZO' });
    expect(res.success).toBe(false);
    expect(mockPrisma.entregaComida.deleteMany).not.toHaveBeenCalled();
  });

  // Sin esta validación un `comida` arbitrario llegaría al `where` del
  // deleteMany, que es la pieza que lleva la autorización.
  test('una comida inexistente se rechaza antes de tocar la base', async () => {
    comoSesion('responsable_viandas', 'SEDE');
    const res = await desmarcarRetiro({ deportistaId: 'd1', comida: 'ONCE' });
    expect(res.success).toBe(false);
    expect(mockPrisma.entregaComida.deleteMany).not.toHaveBeenCalled();
  });

  test('un responsable sin lugar no puede desmarcar', async () => {
    comoSesion('responsable_viandas');
    const res = await desmarcarRetiro({ deportistaId: 'd1', comida: 'ALMUERZO' });
    expect(res.success).toBe(false);
    expect(mockPrisma.entregaComida.deleteMany).not.toHaveBeenCalled();
  });
});

describe('contrato de las actions', () => {
  // El repo nunca lanza al cliente: todo viaja como unión discriminada.
  test('ninguna action lanza, ni con la base caída', async () => {
    comoSesion('responsable_viandas', 'SEDE');
    mockPrisma.entregaComida.create.mockRejectedValue(new Error('boom'));
    await expect(
      marcarRetiro({ deportistaId: 'd1', comida: 'DESAYUNO' }),
    ).resolves.toMatchObject({ success: false });
  });

  test('toda respuesta lleva la fecha que usó el servidor', async () => {
    comoSesion('responsable_viandas', 'SEDE');
    const ok = await marcarRetiro({ deportistaId: 'd1', comida: 'DESAYUNO' });
    const fail = await desmarcarRetiro({ deportistaId: 'd1', comida: 'ALMUERZO' });
    expect(ok.fecha).toBe('2026-03-14');
    expect(fail.fecha).toBe('2026-03-14');
  });
});
