import { describe, test, expect, vi, beforeEach } from 'vitest';

const { mockPrisma, mockTx, mockAuth, mockEsSuperadmin, mockGuardar, mockRedirect, mockCuenta, mockInvClerk } =
  vi.hoisted(() => {
    const mockTx = {
      club: { create: vi.fn() },
      categoria: { createMany: vi.fn() },
      disciplina: { createMany: vi.fn() },
      disciplinaCategoria: { createMany: vi.fn() },
      insightsDashboard: { create: vi.fn() },
      membresia: { create: vi.fn() },
      invitacion: { create: vi.fn() },
    };
    return {
      mockTx,
      mockPrisma: {
        club: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
        $transaction: vi.fn(async (fn: (tx: typeof mockTx) => unknown) => fn(mockTx)),
      },
      mockAuth: vi.fn(),
      mockEsSuperadmin: vi.fn(),
      mockGuardar: vi.fn(),
      mockRedirect: vi.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT:${url}`);
      }),
      mockCuenta: vi.fn(),
      mockInvClerk: vi.fn(),
    };
  });

vi.mock('@clerk/nextjs/server', () => ({ auth: mockAuth }));
vi.mock('next/navigation', () => ({ redirect: mockRedirect }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/tenant/clubes', () => ({ esSuperadmin: mockEsSuperadmin, guardarClubActivo: mockGuardar }));
vi.mock('@/lib/tenant/cuentas', () => ({
  DIAS_INVITACION: 30,
  venceEn: () => new Date('2030-01-01'),
  buscarCuentaVerificada: mockCuenta,
  invitacionClerkPara: mockInvClerk,
}));
vi.mock('@/lib/tenant/invitaciones', () => ({
  nuevoTokenInvitacion: () => ({ token: 'tok', tokenHash: 'hash_tok' }),
}));

import { crearClub, entrarAClub, setClubActivo, getClubes, type CrearClubInput } from '../superadmin';
import { CATEGORIAS_DEFAULT, DISCIPLINAS_DEFAULT } from '@/lib/catalogos/catalogos-default';
import { DASHBOARDS_SISTEMA } from '@/lib/insights/dashboards-sistema';

const INPUT: CrearClubInput = {
  nombre: 'Club Prueba',
  slug: 'club-prueba',
  adminEmail: 'Admin@Prueba.com',
  adminNombre: 'Ana',
  adminApellido: 'Paz',
  copiarCatalogos: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: 'user_staff' });
  mockEsSuperadmin.mockResolvedValue(true);
  mockPrisma.club.findUnique.mockResolvedValue(null);
  mockTx.club.create.mockResolvedValue({ id: 'club_nuevo' });
  mockCuenta.mockResolvedValue(null);
  mockInvClerk.mockResolvedValue('clerk_inv_1');
});

describe('autorización', () => {
  test.each([
    ['sin sesión', null],
    ['no superadmin', 'user_comun'],
  ])('%s: todas las actions devuelven no autorizado', async (_caso, userId) => {
    mockAuth.mockResolvedValue({ userId });
    mockEsSuperadmin.mockResolvedValue(false);

    await expect(crearClub(INPUT)).resolves.toEqual({ ok: false, error: 'No autorizado' });
    await expect(entrarAClub('club_a')).resolves.toEqual({ ok: false, error: 'No autorizado' });
    await expect(setClubActivo('club_a', false)).resolves.toEqual({ ok: false, error: 'No autorizado' });
    await expect(getClubes()).rejects.toThrow('No autorizado');
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockGuardar).not.toHaveBeenCalled();
    expect(mockPrisma.club.updateMany).not.toHaveBeenCalled();
  });
});

describe('crearClub', () => {
  test('en una tx crea club, catálogos, dashboards de sistema e invitación al admin', async () => {
    const res = await crearClub(INPUT);

    expect(res).toEqual({ ok: true, clubId: 'club_nuevo', admin: 'invitado' });
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockTx.club.create).toHaveBeenCalledWith({
      data: { nombre: 'Club Prueba', slug: 'club-prueba' },
      select: { id: true },
    });

    const categorias = mockTx.categoria.createMany.mock.calls[0][0].data;
    const disciplinas = mockTx.disciplina.createMany.mock.calls[0][0].data;
    expect(categorias).toHaveLength(CATEGORIAS_DEFAULT.length);
    expect(disciplinas).toHaveLength(DISCIPLINAS_DEFAULT.length);
    expect([...categorias, ...disciplinas].every((f: { clubId: string }) => f.clubId === 'club_nuevo')).toBe(true);

    // Fútbol queda vinculado a todas las categorías.
    const futbol = disciplinas.find((d: { codigo: string }) => d.codigo === 'FUTBOL');
    const vinculos = mockTx.disciplinaCategoria.createMany.mock.calls[0][0].data;
    expect(vinculos).toHaveLength(CATEGORIAS_DEFAULT.length);
    expect(vinculos.every((v: { disciplinaId: string }) => v.disciplinaId === futbol.id)).toBe(true);

    expect(mockTx.insightsDashboard.create).toHaveBeenCalledTimes(DASHBOARDS_SISTEMA.length);
    for (const [i, d] of DASHBOARDS_SISTEMA.entries()) {
      const { data } = mockTx.insightsDashboard.create.mock.calls[i][0];
      expect(data).toMatchObject({ clubId: 'club_nuevo', slug: d.slug, esSistema: true, creadoPor: 'user_staff' });
      expect(data.widgets.create).toHaveLength(d.widgets.length);
    }

    expect(mockInvClerk).toHaveBeenCalledWith('admin@prueba.com', 'club-prueba');
    expect(mockTx.invitacion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clubId: 'club_nuevo',
        email: 'admin@prueba.com',
        nombre: 'Ana',
        apellido: 'Paz',
        rol: 'admin',
        tokenHash: 'hash_tok',
        clerkInvitationId: 'clerk_inv_1',
        invitadoPor: 'user_staff',
      }),
    });
    expect(mockTx.membresia.create).not.toHaveBeenCalled();
  });

  test('si el admin ya tiene cuenta verificada, crea la membresía admin sin invitar', async () => {
    mockCuenta.mockResolvedValue('user_ana');

    const res = await crearClub(INPUT);

    expect(res).toEqual({ ok: true, clubId: 'club_nuevo', admin: 'miembro' });
    expect(mockTx.membresia.create).toHaveBeenCalledWith({
      data: { userId: 'user_ana', clubId: 'club_nuevo', rol: 'admin' },
    });
    expect(mockInvClerk).not.toHaveBeenCalled();
    expect(mockTx.invitacion.create).not.toHaveBeenCalled();
  });

  test('sin "copiar catálogos" no crea disciplinas ni categorías, pero sí los dashboards', async () => {
    await crearClub({ ...INPUT, copiarCatalogos: false });

    expect(mockTx.categoria.createMany).not.toHaveBeenCalled();
    expect(mockTx.disciplina.createMany).not.toHaveBeenCalled();
    expect(mockTx.disciplinaCategoria.createMany).not.toHaveBeenCalled();
    expect(mockTx.insightsDashboard.create).toHaveBeenCalledTimes(DASHBOARDS_SISTEMA.length);
  });

  test('slug duplicado: error en el campo, sin tocar Clerk ni abrir la tx', async () => {
    mockPrisma.club.findUnique.mockResolvedValue({ id: 'club_existente' });

    const res = await crearClub(INPUT);

    expect(res).toEqual({
      ok: false,
      error: 'Ya existe un club con ese slug',
      campos: { slug: 'Ya existe un club con ese slug' },
    });
    expect(mockCuenta).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  test('slug duplicado por carrera (P2002 en la tx): mismo error', async () => {
    mockPrisma.$transaction.mockRejectedValueOnce(
      Object.assign(new Error('unique'), { code: 'P2002', meta: { target: ['slug'] } }),
    );

    const res = await crearClub(INPUT);

    expect(res).toMatchObject({ ok: false, error: 'Ya existe un club con ese slug' });
  });

  test.each([
    ['Club Prueba', 'slug con mayúsculas y espacios'],
    ['ab', 'slug demasiado corto'],
    ['club--prueba', 'guiones dobles'],
    ['-club', 'guion al principio'],
  ])('slug inválido "%s" (%s): error de validación', async (slug) => {
    const res = await crearClub({ ...INPUT, slug });

    expect(res.ok).toBe(false);
    expect(!res.ok && res.campos?.slug).toBeTruthy();
    expect(mockPrisma.club.findUnique).not.toHaveBeenCalled();
  });

  test('email inválido y nombre vacío: errores por campo', async () => {
    const res = await crearClub({ ...INPUT, nombre: ' ', adminEmail: 'no-es-mail' });

    expect(res.ok).toBe(false);
    expect(!res.ok && res.campos).toMatchObject({
      nombre: expect.any(String),
      adminEmail: 'El email no es válido',
    });
  });

  test('si la tx falla por otra cosa, error genérico', async () => {
    mockPrisma.$transaction.mockRejectedValueOnce(new Error('boom'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(crearClub(INPUT)).resolves.toEqual({ ok: false, error: 'No se pudo crear el club' });
  });
});

describe('entrarAClub', () => {
  test('club activo: guarda la cookie y redirige a /dashboard', async () => {
    mockPrisma.club.findFirst.mockResolvedValue({ id: 'club_a' });

    await expect(entrarAClub('club_a')).rejects.toThrow('NEXT_REDIRECT:/dashboard');
    expect(mockPrisma.club.findFirst).toHaveBeenCalledWith({
      where: { id: 'club_a', activo: true },
      select: { id: true },
    });
    expect(mockGuardar).toHaveBeenCalledWith('club_a');
  });

  test('club inexistente o desactivado: error, sin cookie', async () => {
    mockPrisma.club.findFirst.mockResolvedValue(null);

    await expect(entrarAClub('club_x')).resolves.toEqual({
      ok: false,
      error: 'El club no existe o está desactivado',
    });
    expect(mockGuardar).not.toHaveBeenCalled();
  });
});

describe('setClubActivo', () => {
  test('desactiva el club', async () => {
    mockPrisma.club.updateMany.mockResolvedValue({ count: 1 });

    await expect(setClubActivo('club_a', false)).resolves.toEqual({ ok: true });
    expect(mockPrisma.club.updateMany).toHaveBeenCalledWith({ where: { id: 'club_a' }, data: { activo: false } });
  });

  test('club inexistente: no encontrado', async () => {
    mockPrisma.club.updateMany.mockResolvedValue({ count: 0 });
    await expect(setClubActivo('club_x', true)).resolves.toEqual({ ok: false, error: 'Club no encontrado' });
  });
});

describe('getClubes', () => {
  test('lista los clubes con miembros activos y deportistas', async () => {
    mockPrisma.club.findMany.mockResolvedValue([
      {
        id: 'club_a',
        nombre: 'A',
        slug: 'a',
        activo: true,
        createdAt: new Date('2026-01-01'),
        _count: { membresias: 3, deportistas: 120 },
      },
    ]);

    await expect(getClubes()).resolves.toEqual([
      { id: 'club_a', nombre: 'A', slug: 'a', activo: true, createdAt: new Date('2026-01-01'), miembros: 3, deportistas: 120 },
    ]);
  });
});
