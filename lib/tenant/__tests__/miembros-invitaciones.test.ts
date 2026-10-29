import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma, mockTx, mockClerk, mockGetContextoClub } = vi.hoisted(() => {
  const mockTx = {
    membresia: { upsert: vi.fn() },
    invitacion: { update: vi.fn() },
  };
  return {
    mockTx,
    mockPrisma: {
      membresia: { findMany: vi.fn() },
      invitacion: { findMany: vi.fn() },
      $transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
    },
    mockClerk: { users: { getUserList: vi.fn(), getUser: vi.fn() } },
    mockGetContextoClub: vi.fn(),
  };
});

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@clerk/nextjs/server', () => ({ clerkClient: async () => mockClerk }));
vi.mock('../contexto', () => ({ getContextoClub: mockGetContextoClub }));

const { getMiembrosDelClub } = await import('../miembros');
const { aceptarInvitacionesPendientes, hashToken, nuevoTokenInvitacion } = await import('../invitaciones');
const { SinContextoError } = await import('../errores');
const { mockContexto } = await import('@/test-utils/tenant');

function usuarioClerk(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    firstName: `Nombre ${id}`,
    lastName: `Apellido ${id}`,
    publicMetadata: {},
    emailAddresses: [{ emailAddress: `${id}@club.com` }],
    lastSignInAt: null,
    createdAt: 1_700_000_000_000,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetContextoClub.mockResolvedValue(mockContexto('admin'));
});

describe('getMiembrosDelClub', () => {
  it('pregunta a Clerk solo por los userIds del club activo', async () => {
    mockPrisma.membresia.findMany.mockResolvedValue([
      { userId: 'u1', rol: 'medico', lugarRetiro: null, activo: true },
    ]);
    mockClerk.users.getUserList.mockResolvedValue({ data: [usuarioClerk('u1')] });

    const miembros = await getMiembrosDelClub();

    expect(mockPrisma.membresia.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clubId: 'club_test', activo: true } }),
    );
    expect(mockClerk.users.getUserList).toHaveBeenCalledWith({ userId: ['u1'], limit: 1 });
    expect(miembros).toEqual([
      expect.objectContaining({ userId: 'u1', rol: 'medico', nombre: 'Nombre u1', email: 'u1@club.com' }),
    ]);
  });

  it('filtra por roles y puede incluir inactivos y otro club explícito', async () => {
    mockPrisma.membresia.findMany.mockResolvedValue([]);
    await getMiembrosDelClub({ roles: ['medico', 'kinesiologo'], incluirInactivos: true, clubId: 'club_b' });
    expect(mockPrisma.membresia.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clubId: 'club_b', rol: { in: ['medico', 'kinesiologo'] } } }),
    );
    expect(mockClerk.users.getUserList).not.toHaveBeenCalled();
  });

  it('pide a Clerk en tandas de 100 y descarta membresías sin usuario', async () => {
    const membresias = Array.from({ length: 150 }, (_, i) => ({
      userId: `u${i}`,
      rol: 'entrenador',
      lugarRetiro: null,
      activo: true,
    }));
    mockPrisma.membresia.findMany.mockResolvedValue(membresias);
    mockClerk.users.getUserList.mockImplementation(async ({ userId }: { userId: string[] }) => ({
      data: userId.filter((id) => id !== 'u7').map((id) => usuarioClerk(id)),
    }));

    const miembros = await getMiembrosDelClub();

    expect(mockClerk.users.getUserList).toHaveBeenCalledTimes(2);
    expect(miembros).toHaveLength(149);
    expect(miembros.find((m) => m.userId === 'u7')).toBeUndefined();
  });

  it('usa el nombre de publicMetadata si Clerk no tiene firstName', async () => {
    mockPrisma.membresia.findMany.mockResolvedValue([{ userId: 'u1', rol: 'admin', lugarRetiro: null, activo: true }]);
    mockClerk.users.getUserList.mockResolvedValue({
      data: [usuarioClerk('u1', { firstName: null, lastName: null, publicMetadata: { firstName: 'Ana', lastName: 'Paz' } })],
    });
    const [miembro] = await getMiembrosDelClub();
    expect(miembro).toMatchObject({ nombre: 'Ana', apellido: 'Paz' });
  });

  it('sin contexto ni clubId tira SinContextoError', async () => {
    mockGetContextoClub.mockResolvedValue(null);
    await expect(getMiembrosDelClub()).rejects.toThrow(SinContextoError);
  });
});

describe('tokens de invitación', () => {
  it('genera un token distinto cada vez y guarda solo su hash', () => {
    const a = nuevoTokenInvitacion();
    const b = nuevoTokenInvitacion();
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).toBe(hashToken(a.token));
    expect(a.tokenHash).not.toContain(a.token);
    expect(a.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('aceptarInvitacionesPendientes', () => {
  function conEmails(...emails: { email: string; verificado: boolean }[]) {
    mockClerk.users.getUser.mockResolvedValue({
      id: 'u1',
      emailAddresses: emails.map((e) => ({
        emailAddress: e.email,
        verification: { status: e.verificado ? 'verified' : 'unverified' },
      })),
    });
  }

  function invitacion(id: string, clubId: string, rol = 'medico') {
    return { id, clubId, rol, lugarRetiro: null, email: 'ana@club.com' };
  }

  it('solo busca invitaciones de los mails verificados', async () => {
    conEmails({ email: 'Ana@Club.com', verificado: true }, { email: 'otro@club.com', verificado: false });
    mockPrisma.invitacion.findMany.mockResolvedValue([]);

    await aceptarInvitacionesPendientes('u1');

    const { where } = mockPrisma.invitacion.findMany.mock.calls[0][0];
    expect(where.email).toEqual({ in: ['ana@club.com'], mode: 'insensitive' });
    expect(where).toMatchObject({ aceptadaAt: null, revocadaAt: null, club: { activo: true } });
    // Las vencidas quedan afuera por fecha.
    expect(where.expira.gt).toBeInstanceOf(Date);
  });

  it('sin mails verificados no acepta nada ni consulta invitaciones', async () => {
    conEmails({ email: 'ana@club.com', verificado: false });
    await expect(aceptarInvitacionesPendientes('u1')).resolves.toEqual({ clubIds: [] });
    expect(mockPrisma.invitacion.findMany).not.toHaveBeenCalled();
  });

  it('crea la membresía con el rol invitado sin pisar una existente y marca la invitación', async () => {
    conEmails({ email: 'ana@club.com', verificado: true });
    mockPrisma.invitacion.findMany.mockResolvedValue([invitacion('inv1', 'club_a', 'medico')]);

    await expect(aceptarInvitacionesPendientes('u1')).resolves.toEqual({ clubIds: ['club_a'] });

    expect(mockTx.membresia.upsert).toHaveBeenCalledWith({
      where: { userId_clubId: { userId: 'u1', clubId: 'club_a' } },
      create: { userId: 'u1', clubId: 'club_a', rol: 'medico', lugarRetiro: null },
      update: {},
    });
    expect(mockTx.invitacion.update).toHaveBeenCalledWith({
      where: { id: 'inv1' },
      data: { aceptadaAt: expect.any(Date), aceptadaPor: 'u1' },
    });
  });

  it('con dos invitaciones al mismo club usa la más nueva y marca ambas', async () => {
    conEmails({ email: 'ana@club.com', verificado: true });
    // findMany ordena por createdAt desc: la primera es la más nueva.
    mockPrisma.invitacion.findMany.mockResolvedValue([
      invitacion('nueva', 'club_a', 'admin'),
      invitacion('vieja', 'club_a', 'medico'),
      invitacion('otra', 'club_b', 'social'),
    ]);

    await expect(aceptarInvitacionesPendientes('u1')).resolves.toEqual({ clubIds: ['club_a', 'club_b'] });

    expect(mockTx.membresia.upsert).toHaveBeenCalledTimes(2);
    expect(mockTx.membresia.upsert.mock.calls[0][0].create.rol).toBe('admin');
    expect(mockTx.invitacion.update).toHaveBeenCalledTimes(3);
  });
});
