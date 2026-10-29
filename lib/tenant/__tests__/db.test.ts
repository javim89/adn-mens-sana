import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@/lib/generated/prisma/client';

// lib/db.ts crea el cliente real al importarse; acá no hace falta.
vi.mock('@/lib/db', () => ({ prisma: {} }));

const { mockGetContextoClub } = vi.hoisted(() => ({ mockGetContextoClub: vi.fn() }));
vi.mock('../contexto', () => ({ getContextoClub: mockGetContextoClub }));

const { crearInterceptor, dbDelClub, getDb, conFiltro } = await import('../db');
const { CrossTenantError, SinContextoError, TenantScopeError } = await import('../errores');
const { mockContexto } = await import('@/test-utils/tenant');

const CLUB = 'club_a';

type Delegado = { count: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> };

/**
 * Cliente base falso: cada delegado (`base.deportista`, ...) se crea al usarse.
 * Por defecto todo id consultado es del club (count = cantidad pedida).
 */
function crearBase() {
  const delegados: Record<string, Delegado> = {};
  const base = new Proxy(
    {},
    {
      get(_, nombre: string) {
        delegados[nombre] ??= {
          count: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) => where.id.in.length),
          findUnique: vi.fn(async () => ({ id: 'existe' })),
        };
        return delegados[nombre];
      },
    },
  ) as unknown as PrismaClient;
  // Leer `delegados.x` en un test crea el delegado igual que lo haría la extension.
  const accesible = new Proxy(delegados, {
    get: (_, nombre: string) => (base as unknown as Record<string, Delegado>)[nombre],
  });
  return { base, delegados: accesible };
}

/** Simula que `ajenos` son ids de otro club: no están en el club, pero existen. */
function conAjenos(delegado: Delegado, ajenos: string[]) {
  delegado.count.mockImplementation(async ({ where }: { where: { id: { in: string[] }; AND?: unknown } }) =>
    where.AND ? where.id.in.filter((id) => !ajenos.includes(id)).length : where.id.in.length,
  );
}

let base: PrismaClient;
let delegados: Record<string, Delegado>;
let query: ReturnType<typeof vi.fn>;
let interceptar: ReturnType<typeof crearInterceptor>;

function correr(model: string, operation: string, args: Record<string, unknown>) {
  return interceptar({ model, operation, args, query });
}

/** Los args con los que se terminó ejecutando la query. */
function argsEjecutados() {
  expect(query).toHaveBeenCalledTimes(1);
  return query.mock.calls[0][0];
}

beforeEach(() => {
  vi.clearAllMocks();
  ({ base, delegados } = crearBase());
  query = vi.fn(async () => ({ id: 'resultado' }));
  interceptar = crearInterceptor(CLUB, base);
});

describe('conFiltro', () => {
  it('suma el filtro sin pisar el where ni un AND previo', () => {
    expect(conFiltro({ id: 'x', AND: { estado: 'ACTIVO' } }, { clubId: CLUB })).toEqual({
      id: 'x',
      AND: [{ clubId: CLUB }, { estado: 'ACTIVO' }],
    });
    expect(conFiltro(undefined, { clubId: CLUB })).toEqual({ AND: [{ clubId: CLUB }] });
  });
});

describe('lecturas, updates y deletes: inyectan el filtro en el where', () => {
  it.each([
    'findUnique',
    'findUniqueOrThrow',
    'findFirst',
    'findFirstOrThrow',
    'findMany',
    'count',
    'aggregate',
    'groupBy',
    'delete',
    'deleteMany',
    'update',
    'updateMany',
    'updateManyAndReturn',
  ])('%s sobre una raíz', async (operation) => {
    await correr('Deportista', operation, { where: { dni: '123' }, data: {} });
    expect(argsEjecutados().where).toEqual({ dni: '123', AND: [{ clubId: CLUB }] });
  });

  it('filtra aunque la llamada no traiga where', async () => {
    await correr('Deportista', 'findMany', {});
    expect(argsEjecutados().where).toEqual({ AND: [{ clubId: CLUB }] });
  });

  it('un hijo se filtra por su padre', async () => {
    await correr('DatosSalud', 'findUnique', { where: { deportistaId: 'dep-1' } });
    expect(argsEjecutados().where).toEqual({ deportistaId: 'dep-1', AND: [{ deportista: { clubId: CLUB } }] });
  });

  it('un nieto se filtra por la cadena hasta la raíz', async () => {
    await correr('ApoyoRequerido', 'deleteMany', { where: { necesidadesApoyoId: 'n-1' } });
    expect(argsEjecutados().where).toEqual({
      necesidadesApoyoId: 'n-1',
      AND: [{ necesidadesApoyo: { deportista: { clubId: CLUB } } }],
    });
  });

  it('un where con clubId de otro club no lo saca del filtro', async () => {
    await correr('Deportista', 'findMany', { where: { clubId: 'club_b' } });
    expect(argsEjecutados().where).toEqual({ clubId: 'club_b', AND: [{ clubId: CLUB }] });
  });
});

describe('creates: inyectan el club', () => {
  it('create de una raíz agrega clubId', async () => {
    await correr('Equipo', 'create', { data: { nombre: 'Rival' } });
    expect(argsEjecutados().data).toEqual({ nombre: 'Rival', clubId: CLUB });
  });

  it('create con relaciones "checked" usa club.connect (Prisma no deja mezclar)', async () => {
    await correr('Deportista', 'create', {
      data: { nombre: 'Ana', categoria: { connect: { id: 'cat-1' } } },
    });
    expect(argsEjecutados().data).toEqual({
      nombre: 'Ana',
      categoria: { connect: { id: 'cat-1' } },
      club: { connect: { id: CLUB } },
    });
  });

  it('createMany y createManyAndReturn agregan clubId a cada fila', async () => {
    await correr('Turno', 'createMany', { data: [{ titulo: 'a' }, { titulo: 'b' }] });
    expect(argsEjecutados().data).toEqual([
      { titulo: 'a', clubId: CLUB },
      { titulo: 'b', clubId: CLUB },
    ]);

    query.mockClear();
    await correr('Turno', 'createManyAndReturn', { data: { titulo: 'c' } });
    expect(argsEjecutados().data).toEqual({ titulo: 'c', clubId: CLUB });
  });

  it('upsert filtra el where e inyecta el club en el create', async () => {
    await correr('Categoria', 'upsert', {
      where: { clubId_nombre: { clubId: CLUB, nombre: '4ta' } },
      create: { nombre: '4ta', orden: 1 },
      update: { orden: 1 },
    });
    const args = argsEjecutados();
    expect(args.where).toEqual({ clubId_nombre: { clubId: CLUB, nombre: '4ta' }, AND: [{ clubId: CLUB }] });
    expect(args.create).toEqual({ nombre: '4ta', orden: 1, clubId: CLUB });
    expect(args.update).toEqual({ orden: 1 });
  });

  it('un create de un hijo no agrega clubId (no tiene la columna)', async () => {
    await correr('DatosSalud', 'create', { data: { deportistaId: 'dep-1', grupoSanguineo: '0+' } });
    expect(argsEjecutados().data).toEqual({ deportistaId: 'dep-1', grupoSanguineo: '0+' });
  });

  it('acepta un clubId explícito si es el mismo club', async () => {
    await correr('Equipo', 'create', { data: { nombre: 'Rival', clubId: CLUB } });
    expect(argsEjecutados().data).toEqual({ nombre: 'Rival', clubId: CLUB });
  });
});

describe('rechaza escribir en otro club', () => {
  it('create con clubId ajeno', async () => {
    await expect(correr('Equipo', 'create', { data: { nombre: 'x', clubId: 'club_b' } })).rejects.toThrow(
      CrossTenantError,
    );
    expect(query).not.toHaveBeenCalled();
  });

  it('create con club.connect', async () => {
    await expect(
      correr('Equipo', 'create', { data: { nombre: 'x', club: { connect: { id: CLUB } } } }),
    ).rejects.toThrow(CrossTenantError);
  });

  it('update que mueve la fila de club', async () => {
    await expect(correr('Deportista', 'update', { where: { id: 'd' }, data: { clubId: 'club_b' } })).rejects.toThrow(
      CrossTenantError,
    );
    await expect(
      correr('Deportista', 'updateMany', { where: {}, data: { clubId: { set: 'club_b' } } }),
    ).rejects.toThrow(CrossTenantError);
  });

  it('createMany con una fila de otro club', async () => {
    await expect(
      correr('Turno', 'createMany', { data: [{ titulo: 'a' }, { titulo: 'b', clubId: 'club_b' }] }),
    ).rejects.toThrow(CrossTenantError);
  });
});

describe('valida las FK contra el club', () => {
  it('FK escalar de una raíz a otro club → CrossTenantError, sin ejecutar', async () => {
    conAjenos(delegados.categoria, ['cat-b']);
    await expect(correr('Deportista', 'create', { data: { nombre: 'x', categoriaId: 'cat-b' } })).rejects.toThrow(
      CrossTenantError,
    );
    expect(query).not.toHaveBeenCalled();
  });

  it('FK escalar del club → pasa, contando con el filtro del club', async () => {
    await correr('Deportista', 'create', { data: { nombre: 'x', categoriaId: 'cat-a', disciplinaId: 'dis-a' } });
    expect(delegados.categoria.count).toHaveBeenCalledWith({
      where: { id: { in: ['cat-a'] }, AND: [{ clubId: CLUB }] },
    });
    expect(delegados.disciplina.count).toHaveBeenCalled();
    expect(query).toHaveBeenCalled();
  });

  it('un id que no existe en ningún club lo decide la FK de la base', async () => {
    delegados.categoria.count.mockResolvedValue(0);
    await correr('Deportista', 'create', { data: { nombre: 'x', categoriaId: 'no-existe' } });
    expect(query).toHaveBeenCalled();
  });

  it('update con { set } a una FK de otro club', async () => {
    conAjenos(delegados.categoria, ['cat-b']);
    await expect(
      correr('Deportista', 'update', { where: { id: 'd' }, data: { categoriaId: { set: 'cat-b' } } }),
    ).rejects.toThrow(CrossTenantError);
  });

  it('connect por id a otro club', async () => {
    conAjenos(delegados.categoria, ['cat-b']);
    await expect(
      correr('Deportista', 'update', { where: { id: 'd' }, data: { categoria: { connect: { id: 'cat-b' } } } }),
    ).rejects.toThrow(CrossTenantError);
  });

  it('connect por otro unique: busca con el filtro del club', async () => {
    delegados.categoria.findUnique.mockImplementation(async ({ where }: { where: { AND?: unknown } }) =>
      where.AND ? null : { id: 'cat-b' },
    );
    const connect = { clubId_nombre: { clubId: 'club_b', nombre: '4ta' } };
    await expect(
      correr('Deportista', 'create', { data: { nombre: 'x', categoria: { connect } } }),
    ).rejects.toThrow(CrossTenantError);
    expect(delegados.categoria.findUnique).toHaveBeenCalledWith({ where: { ...connect, AND: [{ clubId: CLUB }] } });
  });

  it('el create de un hijo valida el padre (raíz)', async () => {
    conAjenos(delegados.deportista, ['dep-b']);
    await expect(correr('DatosSalud', 'create', { data: { deportistaId: 'dep-b' } })).rejects.toThrow(
      CrossTenantError,
    );
  });

  it('el create de un nieto valida el padre con su propio filtro', async () => {
    conAjenos(delegados.datosSalud, ['salud-b']);
    await expect(
      correr('EnfermedadPreexistenteItem', 'create', { data: { datosSaludId: 'salud-b', enfermedad: 'ASMA' } }),
    ).rejects.toThrow(CrossTenantError);
    expect(delegados.datosSalud.count).toHaveBeenCalledWith({
      where: { id: { in: ['salud-b'] }, AND: [{ deportista: { clubId: CLUB } }] },
    });
  });

  it('upsert de un hijo con el padre de otro club', async () => {
    conAjenos(delegados.deportista, ['dep-b']);
    await expect(
      correr('NecesidadesApoyo', 'upsert', {
        where: { deportistaId: 'dep-b' },
        create: { deportistaId: 'dep-b' },
        update: {},
      }),
    ).rejects.toThrow(CrossTenantError);
  });
});

describe('nested writes', () => {
  it('nested create de hijos valida sus FK (seguimiento → deportistas de otro club)', async () => {
    conAjenos(delegados.deportista, ['dep-b']);
    await expect(
      correr('Seguimiento', 'create', {
        data: { titulo: 's', deportistas: { create: [{ deportistaId: 'dep-a' }, { deportistaId: 'dep-b' }] } },
      }),
    ).rejects.toThrow(CrossTenantError);
  });

  it('nested createMany valida sus FK', async () => {
    conAjenos(delegados.deportista, ['dep-b']);
    await expect(
      correr('Turno', 'update', {
        where: { id: 't' },
        data: { deportistas: { createMany: { data: [{ deportistaId: 'dep-b' }] } } },
      }),
    ).rejects.toThrow(CrossTenantError);
  });

  it('nested create de una raíz bajo otra raíz le inyecta el club', async () => {
    await correr('Categoria', 'update', {
      where: { id: 'cat-a' },
      data: { deportistas: { create: { nombre: 'Ana', dni: '1' } } },
    });
    expect(argsEjecutados().data).toEqual({
      deportistas: { create: { nombre: 'Ana', dni: '1', clubId: CLUB } },
    });
  });

  it('nested create de satélites queda igual (hijos sin club)', async () => {
    await correr('Deportista', 'create', {
      data: { nombre: 'Ana', datosSalud: { create: { grupoSanguineo: '0+' } } },
    });
    expect(argsEjecutados().data).toEqual({
      nombre: 'Ana',
      datosSalud: { create: { grupoSanguineo: '0+' } },
      clubId: CLUB,
    });
  });

  it('nested connect/set de hijos a filas de otro club', async () => {
    conAjenos(delegados.deportista, ['dep-b']);
    await expect(
      correr('Categoria', 'update', { where: { id: 'c' }, data: { deportistas: { set: [{ id: 'dep-b' }] } } }),
    ).rejects.toThrow(CrossTenantError);
  });

  it('nested update recorre la data del hijo', async () => {
    conAjenos(delegados.categoria, ['cat-b']);
    await expect(
      correr('Disciplina', 'update', {
        where: { id: 'dis' },
        data: { categorias: { update: { where: { id: 'dc' }, data: { categoriaId: 'cat-b' } } } },
      }),
    ).rejects.toThrow(CrossTenantError);
  });

  it('nested connectOrCreate a una fila existente de otro club', async () => {
    delegados.categoria.findUnique.mockImplementation(async ({ where }: { where: { AND?: unknown } }) =>
      where.AND ? null : { id: 'cat-b' },
    );
    await expect(
      correr('Deportista', 'create', {
        data: {
          nombre: 'x',
          categoria: {
            connectOrCreate: { where: { id: 'cat-b', nombre: '4ta' }, create: { nombre: '4ta', orden: 1 } },
          },
        },
      }),
    ).rejects.toThrow(CrossTenantError);
  });

  it('nested connectOrCreate inyecta el club en el create', async () => {
    delegados.categoria.findUnique.mockResolvedValue(null);
    await correr('Deportista', 'create', {
      data: {
        nombre: 'x',
        categoria: { connectOrCreate: { where: { id: 'nueva', orden: 1 }, create: { nombre: '4ta', orden: 1 } } },
      },
    });
    expect(argsEjecutados().data.categoria.connectOrCreate.create).toEqual({ nombre: '4ta', orden: 1, clubId: CLUB });
  });

  it('nested club.connect dentro de un hijo raíz también se rechaza', async () => {
    await expect(
      correr('Categoria', 'update', {
        where: { id: 'c' },
        data: { deportistas: { create: { nombre: 'x', club: { connect: { id: 'club_b' } } } } },
      }),
    ).rejects.toThrow(CrossTenantError);
  });

  it('un nested write desconocido falla cerrado', async () => {
    await expect(
      correr('Deportista', 'update', { where: { id: 'd' }, data: { datosSalud: { teletransportar: {} } } }),
    ).rejects.toThrow(TenantScopeError);
  });
});

describe('propios: padres creados por este cliente', () => {
  it('un hijo que apunta a un padre recién creado no consulta la base', async () => {
    query.mockResolvedValueOnce({ id: 'dep-nuevo' });
    await correr('Deportista', 'create', { data: { nombre: 'Ana' } });

    // Dentro de una tx el padre no es visible para la base: sin `propios` daría 0.
    delegados.deportista.count.mockResolvedValue(0);
    await correr('DatosSalud', 'create', { data: { deportistaId: 'dep-nuevo' } });
    expect(delegados.deportista.count).not.toHaveBeenCalled();
  });

  it('registra los ids de createManyAndReturn y de createMany con id explícito', async () => {
    query.mockResolvedValueOnce([{ id: 'e1' }, { id: 'e2' }]);
    await correr('Equipo', 'createManyAndReturn', { data: [{ nombre: 'a' }, { nombre: 'b' }] });
    query.mockResolvedValueOnce({ count: 1 });
    await correr('DiaCalendario', 'createMany', { data: [{ id: 'dia-1', fecha: new Date() }] });

    await correr('EventoTorneo', 'create', {
      data: { diaCalendarioId: 'dia-1', localId: 'e1', visitanteId: 'e2', categoriaId: 'cat-a' },
    });
    expect(delegados.equipo.count).not.toHaveBeenCalled();
    expect(delegados.diaCalendario.count).not.toHaveBeenCalled();
    expect(delegados.categoria.count).toHaveBeenCalled();
  });

  it('cada cliente tiene sus propios (no se comparten entre requests)', async () => {
    query.mockResolvedValueOnce({ id: 'dep-nuevo' });
    await correr('Deportista', 'create', { data: { nombre: 'Ana' } });

    const otro = crearInterceptor(CLUB, base);
    await otro({ model: 'DatosSalud', operation: 'create', args: { data: { deportistaId: 'dep-nuevo' } }, query });
    expect(delegados.deportista.count).toHaveBeenCalled();
  });
});

describe('falla cerrado', () => {
  it.each(['Club', 'Superadmin', 'InsightsSesion'])('modelo global %s', async (model) => {
    await expect(correr(model, 'findMany', {})).rejects.toThrow(TenantScopeError);
    expect(query).not.toHaveBeenCalled();
  });

  it('modelo sin clasificar', async () => {
    await expect(correr('ModeloNuevo', 'findMany', {})).rejects.toThrow(TenantScopeError);
  });

  it('operación desconocida', async () => {
    await expect(correr('Deportista', 'findRaw', {})).rejects.toThrow(TenantScopeError);
  });

  it('operación sin modelo', async () => {
    await expect(interceptar({ operation: '$queryRaw', args: {}, query })).rejects.toThrow(TenantScopeError);
  });
});

describe('dbDelClub', () => {
  it('extiende el cliente base con el interceptor', async () => {
    const $extends = vi.fn((ext) => ext);
    const ext = dbDelClub(CLUB, { $extends } as unknown as PrismaClient) as unknown as {
      name: string;
      query: { $allModels: { $allOperations: (op: unknown) => Promise<unknown> } };
    };
    expect(ext.name).toBe('tenant');

    await ext.query.$allModels.$allOperations({ model: 'Equipo', operation: 'findMany', args: {}, query });
    expect(argsEjecutados().where).toEqual({ AND: [{ clubId: CLUB }] });
  });

  it('sin clubId no arma el cliente', () => {
    expect(() => dbDelClub('', {} as PrismaClient)).toThrow(SinContextoError);
  });
});

describe('getDb', () => {
  it('sin contexto tira SinContextoError', async () => {
    mockGetContextoClub.mockResolvedValue(null);
    await expect(getDb()).rejects.toThrow(SinContextoError);
  });

  it('con contexto arma el cliente del club activo', async () => {
    mockGetContextoClub.mockResolvedValue(mockContexto('admin'));
    const $extends = vi.fn(() => 'cliente-del-club');
    const { prisma } = await import('@/lib/db');
    Object.assign(prisma, { $extends });
    await expect(getDb()).resolves.toBe('cliente-del-club');
  });
});
