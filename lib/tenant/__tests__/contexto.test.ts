import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAuth, mockCookieGet, mockRedirect, mockPrisma } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockCookieGet: vi.fn(),
  mockRedirect: vi.fn((destino: string) => {
    throw new Error(`NEXT_REDIRECT:${destino}`);
  }),
  mockPrisma: {
    membresia: { findMany: vi.fn() },
    superadmin: { findUnique: vi.fn() },
    club: { findFirst: vi.fn() },
  },
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: mockAuth }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: mockCookieGet }) }));
vi.mock('next/navigation', () => ({ redirect: mockRedirect }));
vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));

const { getContextoClub, requireContexto, contextoAccion, contextoApi, CLUB_COOKIE } = await import('../contexto');

function club(id: string) {
  return { id, nombre: `Club ${id}`, slug: id, logoKey: null, colorPrimario: null, colorSecundario: null, colorAcento: null };
}

function membresia(clubId: string, rol = 'entrenador', lugarRetiro: string | null = null) {
  return { clubId, rol, lugarRetiro, club: club(clubId) };
}

function sesion({
  userId = 'user_1',
  cookie,
  membresias = [],
  superadmin = false,
}: {
  userId?: string | null;
  cookie?: string;
  membresias?: ReturnType<typeof membresia>[];
  superadmin?: boolean;
}) {
  mockAuth.mockResolvedValue({ userId });
  mockCookieGet.mockImplementation((nombre: string) =>
    nombre === CLUB_COOKIE && cookie ? { name: nombre, value: cookie } : undefined,
  );
  mockPrisma.membresia.findMany.mockResolvedValue(membresias);
  mockPrisma.superadmin.findUnique.mockResolvedValue(superadmin ? { userId } : null);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.club.findFirst.mockResolvedValue(null);
});

describe('getContextoClub', () => {
  it('sin sesión devuelve null sin consultar la base', async () => {
    sesion({ userId: null });
    await expect(getContextoClub()).resolves.toBeNull();
    expect(mockPrisma.membresia.findMany).not.toHaveBeenCalled();
  });

  it('solo considera membresías activas de clubes activos, la más vieja primero', async () => {
    sesion({ membresias: [membresia('club_a')] });
    await getContextoClub();
    expect(mockPrisma.membresia.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user_1', activo: true, club: { activo: true } },
        orderBy: { createdAt: 'asc' },
      }),
    );
  });

  it('con la cookie de un club del que es miembro, usa ese club y su rol', async () => {
    sesion({ cookie: 'club_b', membresias: [membresia('club_a', 'admin'), membresia('club_b', 'medico')] });
    await expect(getContextoClub()).resolves.toEqual({
      userId: 'user_1',
      clubId: 'club_b',
      rol: 'medico',
      lugarRetiro: null,
      club: club('club_b'),
      esSuperadmin: false,
      comoSuperadmin: false,
    });
  });

  it('pasa el lugar de retiro de la membresía', async () => {
    sesion({ membresias: [membresia('club_a', 'responsable_viandas', 'SEDE')] });
    const contexto = await getContextoClub();
    expect(contexto?.lugarRetiro).toBe('SEDE');
  });

  it('sin cookie cae en la primera membresía', async () => {
    sesion({ membresias: [membresia('club_a', 'admin'), membresia('club_b')] });
    expect((await getContextoClub())?.clubId).toBe('club_a');
  });

  it('una cookie de un club ajeno (o de una membresía inactiva) cae en la primera membresía', async () => {
    // La membresía inactiva no vuelve del findMany: para el contexto es como no tenerla.
    sesion({ cookie: 'club_x', membresias: [membresia('club_a', 'admin')] });
    const contexto = await getContextoClub();
    expect(contexto?.clubId).toBe('club_a');
    expect(contexto?.rol).toBe('admin');
    // Un usuario común no habilita a buscar clubes por la cookie.
    expect(mockPrisma.club.findFirst).not.toHaveBeenCalled();
  });

  it('sin membresías activas devuelve null', async () => {
    sesion({ cookie: 'club_a', membresias: [] });
    await expect(getContextoClub()).resolves.toBeNull();
  });

  it('un superadmin entra a un club activo del que no es miembro como admin', async () => {
    sesion({ cookie: 'club_z', membresias: [], superadmin: true });
    mockPrisma.club.findFirst.mockResolvedValue(club('club_z'));
    await expect(getContextoClub()).resolves.toEqual({
      userId: 'user_1',
      clubId: 'club_z',
      rol: 'admin',
      lugarRetiro: null,
      club: club('club_z'),
      esSuperadmin: true,
      comoSuperadmin: true,
    });
    expect(mockPrisma.club.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'club_z', activo: true } }),
    );
  });

  it('un superadmin con la cookie de un club inactivo o inexistente cae en su membresía', async () => {
    sesion({ cookie: 'club_inactivo', membresias: [membresia('club_a', 'medico')], superadmin: true });
    const contexto = await getContextoClub();
    expect(contexto).toMatchObject({ clubId: 'club_a', rol: 'medico', esSuperadmin: true, comoSuperadmin: false });
  });

  it('un superadmin sin membresías ni cookie no tiene contexto de club', async () => {
    sesion({ membresias: [], superadmin: true });
    await expect(getContextoClub()).resolves.toBeNull();
  });

  it('un superadmin que es miembro del club pedido usa su membresía, no el modo superadmin', async () => {
    sesion({ cookie: 'club_a', membresias: [membresia('club_a', 'entrenador')], superadmin: true });
    const contexto = await getContextoClub();
    expect(contexto).toMatchObject({ rol: 'entrenador', comoSuperadmin: false, esSuperadmin: true });
  });
});

describe('requireContexto', () => {
  it('sin contexto redirige a /bienvenida', async () => {
    sesion({ membresias: [] });
    await expect(requireContexto()).rejects.toThrow('NEXT_REDIRECT:/bienvenida');
  });

  it('con un rol no permitido redirige a /dashboard', async () => {
    sesion({ membresias: [membresia('club_a', 'entrenador')] });
    await expect(requireContexto(['admin'])).rejects.toThrow('NEXT_REDIRECT:/dashboard');
  });

  it('con un rol permitido devuelve el contexto', async () => {
    sesion({ membresias: [membresia('club_a', 'admin')] });
    await expect(requireContexto(['admin', 'medico'])).resolves.toMatchObject({ clubId: 'club_a' });
  });
});

describe('contextoAccion', () => {
  it('sin contexto devuelve No autorizado', async () => {
    sesion({ userId: null });
    await expect(contextoAccion()).resolves.toEqual({ ok: false, error: 'No autorizado' });
  });

  it('con un rol no permitido devuelve Acceso denegado', async () => {
    sesion({ membresias: [membresia('club_a', 'social')] });
    await expect(contextoAccion(['admin'])).resolves.toEqual({ ok: false, error: 'Acceso denegado' });
  });

  it('con un rol permitido devuelve el contexto', async () => {
    sesion({ membresias: [membresia('club_a', 'admin')] });
    const resultado = await contextoAccion(['admin']);
    expect(resultado.ok && resultado.contexto.clubId).toBe('club_a');
  });
});

describe('contextoApi', () => {
  it('sin sesión responde 401 JSON:API', async () => {
    sesion({ userId: null });
    const resultado = await contextoApi();
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.response.status).toBe(401);
    expect(resultado.response.headers.get('Content-Type')).toBe('application/vnd.api+json');
    expect((await resultado.response.json()).errors[0].code).toBe('UNAUTHENTICATED');
  });

  it('con sesión pero sin club responde 403 NO_CLUB', async () => {
    sesion({ membresias: [] });
    const resultado = await contextoApi();
    if (resultado.ok) throw new Error('debería fallar');
    expect(resultado.response.status).toBe(403);
    expect((await resultado.response.json()).errors[0].code).toBe('NO_CLUB');
  });

  it('con un rol no permitido responde 403 FORBIDDEN', async () => {
    sesion({ membresias: [membresia('club_a', 'social')] });
    const resultado = await contextoApi(['admin']);
    if (resultado.ok) throw new Error('debería fallar');
    expect(resultado.response.status).toBe(403);
    expect((await resultado.response.json()).errors[0].code).toBe('FORBIDDEN');
  });

  it('con un rol permitido devuelve el contexto', async () => {
    sesion({ membresias: [membresia('club_a', 'admin')] });
    const resultado = await contextoApi(['admin']);
    expect(resultado.ok).toBe(true);
  });
});
