import { describe, test, expect, vi, beforeEach } from 'vitest';

const { mockDb, mockClerk, mockClerkClient, mockGetMiembros } = vi.hoisted(() => {
  const mockDb = {
    membresia: {
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    invitacion: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };

  const mockClerk = {
    users: {
      getUserList: vi.fn(),
      banUser: vi.fn(),
      unbanUser: vi.fn(),
      deleteUser: vi.fn(),
      updateUserMetadata: vi.fn(),
    },
    invitations: {
      getInvitationList: vi.fn(),
      createInvitation: vi.fn(),
      revokeInvitation: vi.fn(),
    },
  };

  return {
    mockDb,
    mockClerk,
    mockClerkClient: vi.fn(async () => mockClerk),
    mockGetMiembros: vi.fn(),
  };
});

vi.mock('@clerk/nextjs/server', () => ({ clerkClient: mockClerkClient }));
vi.mock('@/lib/tenant/contexto', async () =>
  (await import('@/test-utils/tenant')).moduloContextoMock(),
);
vi.mock('@/lib/tenant/db', async () => (await import('@/test-utils/tenant')).moduloDbMock(mockDb));
vi.mock('@/lib/tenant/miembros', () => ({ getMiembrosDelClub: mockGetMiembros }));
vi.mock('@/lib/tenant/invitaciones', () => ({
  nuevoTokenInvitacion: () => ({ token: 'tok', tokenHash: 'hash_tok' }),
}));

import {
  getUsuarios,
  invitarUsuario,
  reenviarInvitacion,
  deshabilitarUsuario,
  reactivarUsuario,
  eliminarUsuario,
  cambiarRol,
  asignarLugarRetiro,
} from '../usuarios';
import { mockContexto, setContexto, CLUB_TEST } from '@/test-utils/tenant';

const ADMIN = 'user_admin_123';

/** Una cuenta de Clerk con el mail dado; `verificado` decide si cuenta como suya. */
function cuentaClerk(id: string, email: string, verificado = true) {
  return {
    id,
    emailAddresses: [
      { emailAddress: email, verification: { status: verificado ? 'verified' : 'unverified' } },
    ],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  setContexto(mockContexto('admin', { userId: ADMIN }));

  mockDb.membresia.findFirst.mockResolvedValue(null);
  mockDb.membresia.count.mockResolvedValue(2);
  mockDb.membresia.create.mockResolvedValue({ id: 'mem_new' });
  mockDb.membresia.updateMany.mockResolvedValue({ count: 1 });
  mockDb.membresia.deleteMany.mockResolvedValue({ count: 1 });
  mockDb.invitacion.findMany.mockResolvedValue([]);
  mockDb.invitacion.findFirst.mockResolvedValue(null);
  mockDb.invitacion.create.mockResolvedValue({ id: 'inv_db_new' });
  mockDb.invitacion.update.mockResolvedValue({});
  mockDb.invitacion.updateMany.mockResolvedValue({ count: 1 });

  mockClerk.users.getUserList.mockResolvedValue({ data: [] });
  mockClerk.invitations.getInvitationList.mockResolvedValue({ data: [] });
  mockClerk.invitations.createInvitation.mockResolvedValue({ id: 'clerk_inv_new' });
  mockClerk.invitations.revokeInvitation.mockResolvedValue({});
  mockGetMiembros.mockResolvedValue([]);
});

/** Ninguna action de usuarios toca la cuenta de Clerk: eso la sacaría de TODOS los clubes. */
function expectCuentaIntacta() {
  expect(mockClerk.users.banUser).not.toHaveBeenCalled();
  expect(mockClerk.users.unbanUser).not.toHaveBeenCalled();
  expect(mockClerk.users.deleteUser).not.toHaveBeenCalled();
  expect(mockClerk.users.updateUserMetadata).not.toHaveBeenCalled();
}

// ---------------------------------------------------------------------------
// Autorización (contexto del club activo)
// ---------------------------------------------------------------------------

describe('autorización', () => {
  const acciones: [string, () => Promise<{ ok: boolean; error?: string }>][] = [
    ['invitarUsuario', () => invitarUsuario({ firstName: 'A', lastName: 'B', email: 'a@b.com', rol: 'medico' })],
    ['reenviarInvitacion', () => reenviarInvitacion('inv_1')],
    ['deshabilitarUsuario', () => deshabilitarUsuario('user_x')],
    ['reactivarUsuario', () => reactivarUsuario('user_x')],
    ['eliminarUsuario', () => eliminarUsuario('user_x', 'activo')],
    ['cambiarRol', () => cambiarRol('user_x', 'medico')],
    ['asignarLugarRetiro', () => asignarLugarRetiro('user_x', 'SEDE')],
  ];

  test.each(acciones)('%s sin club activo devuelve No autorizado', async (_, accion) => {
    setContexto(null);
    await expect(accion()).resolves.toEqual({ ok: false, error: 'No autorizado' });
    expect(mockDb.membresia.updateMany).not.toHaveBeenCalled();
    expect(mockDb.membresia.create).not.toHaveBeenCalled();
  });

  test.each(acciones)('%s con un rol no admin devuelve acceso denegado', async (_, accion) => {
    setContexto(mockContexto('entrenador'));
    const res = await accion();
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/admin/i);
    expect(mockDb.membresia.updateMany).not.toHaveBeenCalled();
  });

  test('getUsuarios lanza si el caller no es admin', async () => {
    setContexto(mockContexto('medico'));
    await expect(getUsuarios()).rejects.toThrow(/admin/i);
  });
});

// ---------------------------------------------------------------------------
// getUsuarios
// ---------------------------------------------------------------------------

describe('getUsuarios', () => {
  test('lista miembros del club (activos e inactivos) y las invitaciones pendientes', async () => {
    mockGetMiembros.mockResolvedValue([
      {
        userId: 'user_2',
        rol: 'entrenador',
        lugarRetiro: null,
        activo: false,
        nombre: 'Pedro',
        apellido: 'González',
        email: 'p@club.com',
        lastSignInAt: null,
        createdAt: new Date('2026-01-01'),
      },
      {
        userId: 'user_1',
        rol: 'admin',
        lugarRetiro: null,
        activo: true,
        nombre: 'Laura',
        apellido: 'Méndez',
        email: 'l@club.com',
        lastSignInAt: new Date('2026-06-01'),
        createdAt: new Date('2026-01-01'),
      },
    ]);
    mockDb.invitacion.findMany.mockResolvedValue([
      {
        id: 'inv_1',
        email: 's@club.com',
        nombre: 'Sergio',
        apellido: 'Blanco',
        rol: 'responsable_viandas',
        lugarRetiro: 'SEDE',
        createdAt: new Date('2026-06-02'),
      },
    ]);

    const usuarios = await getUsuarios();

    expect(mockGetMiembros).toHaveBeenCalledWith({ incluirInactivos: true, clubId: CLUB_TEST.id });
    expect(usuarios.map((u) => [u.id, u.status])).toEqual([
      ['user_1', 'activo'],
      ['user_2', 'inactivo'],
      ['inv_1', 'pendiente'],
    ]);
    expect(usuarios[2]).toMatchObject({ firstName: 'Sergio', rol: 'responsable_viandas', lugarRetiro: 'SEDE' });
  });

  test('pide solo invitaciones vigentes (no aceptadas, no revocadas, no vencidas)', async () => {
    await getUsuarios();
    const { where } = mockDb.invitacion.findMany.mock.calls[0][0];
    expect(where).toMatchObject({ aceptadaAt: null, revocadaAt: null, expira: { gt: expect.any(Date) } });
  });

  test('no lista la invitación de alguien que ya es miembro', async () => {
    mockGetMiembros.mockResolvedValue([
      {
        userId: 'user_1',
        rol: 'medico',
        lugarRetiro: null,
        activo: true,
        nombre: 'Ana',
        apellido: 'Paz',
        email: 'ana@club.com',
        lastSignInAt: null,
        createdAt: new Date(),
      },
    ]);
    mockDb.invitacion.findMany.mockResolvedValue([
      { id: 'inv_1', email: 'ANA@club.com', nombre: 'Ana', apellido: 'Paz', rol: 'medico', lugarRetiro: null, createdAt: new Date() },
    ]);

    const usuarios = await getUsuarios();
    expect(usuarios.map((u) => u.id)).toEqual(['user_1']);
  });
});

// ---------------------------------------------------------------------------
// invitarUsuario
// ---------------------------------------------------------------------------

describe('invitarUsuario', () => {
  const base = { firstName: 'Ana', lastName: 'Paz', email: '  Ana@Club.com ', rol: 'medico' };

  test('rechaza un rol no permitido', async () => {
    const res = await invitarUsuario({ ...base, rol: 'superusuario' });
    expect(res).toEqual({ ok: false, error: 'Rol no permitido' });
    expect(mockClerk.invitations.createInvitation).not.toHaveBeenCalled();
  });

  test('responsable de viandas sin lugar se rechaza antes de tocar Clerk', async () => {
    const res = await invitarUsuario({ ...base, rol: 'responsable_viandas' });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/lugar de retiro/i);
    expect(mockClerk.users.getUserList).not.toHaveBeenCalled();
  });

  test('responsable de viandas con lugar inválido se rechaza', async () => {
    const res = await invitarUsuario({ ...base, rol: 'responsable_viandas', lugarRetiro: 'MARTE' });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/inválido/i);
  });

  test('cuenta de Clerk existente (mail verificado): crea la membresía directo, sin invitación', async () => {
    mockClerk.users.getUserList.mockResolvedValue({ data: [cuentaClerk('user_ana', 'ana@club.com')] });

    const res = await invitarUsuario(base);

    expect(res).toEqual({ ok: true });
    expect(mockClerk.users.getUserList).toHaveBeenCalledWith(
      expect.objectContaining({ emailAddress: ['ana@club.com'] }),
    );
    expect(mockDb.membresia.create).toHaveBeenCalledWith({
      data: { userId: 'user_ana', clubId: CLUB_TEST.id, rol: 'medico', lugarRetiro: null },
    });
    expect(mockDb.invitacion.create).not.toHaveBeenCalled();
    expect(mockClerk.invitations.createInvitation).not.toHaveBeenCalled();
    expectCuentaIntacta();
  });

  test('cuenta existente que ya es miembro del club: error, sin duplicar', async () => {
    mockClerk.users.getUserList.mockResolvedValue({ data: [cuentaClerk('user_ana', 'ana@club.com')] });
    mockDb.membresia.findFirst.mockResolvedValue({ id: 'mem_1' });

    const res = await invitarUsuario(base);

    expect(res).toEqual({ ok: false, error: 'Esa persona ya es miembro del club' });
    expect(mockDb.membresia.create).not.toHaveBeenCalled();
  });

  test('un mail sin verificar no cuenta como cuenta existente: va por invitación', async () => {
    mockClerk.users.getUserList.mockResolvedValue({
      data: [cuentaClerk('user_otro', 'ana@club.com', false)],
    });

    const res = await invitarUsuario(base);

    expect(res).toEqual({ ok: true });
    expect(mockDb.membresia.create).not.toHaveBeenCalled();
    expect(mockDb.invitacion.create).toHaveBeenCalled();
  });

  test('sin cuenta: crea la invitación de Clerk y la Invitacion del club', async () => {
    const res = await invitarUsuario({ ...base, rol: 'responsable_viandas', lugarRetiro: 'SEDE' });

    expect(res).toEqual({ ok: true });
    expect(mockClerk.invitations.createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ emailAddress: 'ana@club.com' }),
    );
    // La invitación de Clerk ya no lleva el rol: el acceso lo da la fila del club.
    expect(mockClerk.invitations.createInvitation.mock.calls[0][0]).not.toHaveProperty('publicMetadata');
    expect(mockDb.invitacion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clubId: CLUB_TEST.id,
        email: 'ana@club.com',
        nombre: 'Ana',
        apellido: 'Paz',
        rol: 'responsable_viandas',
        lugarRetiro: 'SEDE',
        tokenHash: 'hash_tok',
        clerkInvitationId: 'clerk_inv_new',
        invitadoPor: ADMIN,
        expira: expect.any(Date),
      }),
    });
    expect(mockDb.membresia.create).not.toHaveBeenCalled();
  });

  test('reutiliza la invitación de Clerk pendiente que dejó otro club', async () => {
    mockClerk.invitations.getInvitationList.mockResolvedValue({
      data: [{ id: 'clerk_inv_otro_club', emailAddress: 'ana@club.com' }],
    });

    const res = await invitarUsuario(base);

    expect(res).toEqual({ ok: true });
    expect(mockClerk.invitations.createInvitation).not.toHaveBeenCalled();
    expect(mockClerk.invitations.revokeInvitation).not.toHaveBeenCalled();
    expect(mockDb.invitacion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ clerkInvitationId: 'clerk_inv_otro_club' }),
    });
  });

  test('ya hay una invitación pendiente del club para ese mail: error', async () => {
    mockDb.invitacion.findFirst.mockResolvedValue({ id: 'inv_vieja' });

    const res = await invitarUsuario(base);

    expect(res).toEqual({ ok: false, error: 'Ya existe una invitación pendiente para ese email' });
    expect(mockClerk.invitations.createInvitation).not.toHaveBeenCalled();
    expect(mockDb.invitacion.create).not.toHaveBeenCalled();
  });

  test('un error de Clerk se devuelve sin crear la Invitacion', async () => {
    mockClerk.invitations.createInvitation.mockRejectedValue(new Error('Clerk caído'));

    const res = await invitarUsuario(base);

    expect(res).toEqual({ ok: false, error: 'Clerk caído' });
    expect(mockDb.invitacion.create).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// reenviarInvitacion
// ---------------------------------------------------------------------------

describe('reenviarInvitacion', () => {
  const invitacion = {
    id: 'inv_1',
    clubId: CLUB_TEST.id,
    email: 'ana@club.com',
    rol: 'medico',
    lugarRetiro: null,
  };

  test('invitación inexistente (o de otro club): error', async () => {
    const res = await reenviarInvitacion('inv_x');
    expect(res).toEqual({ ok: false, error: 'Invitación no encontrada' });
  });

  test('renueva la invitación de Clerk (revoca la pendiente y crea otra) y extiende la vigencia', async () => {
    mockDb.invitacion.findFirst.mockResolvedValue(invitacion);
    mockClerk.invitations.getInvitationList.mockResolvedValue({
      data: [{ id: 'clerk_inv_vieja', emailAddress: 'ana@club.com' }],
    });

    const res = await reenviarInvitacion('inv_1');

    expect(res).toEqual({ ok: true });
    expect(mockClerk.invitations.revokeInvitation).toHaveBeenCalledWith('clerk_inv_vieja');
    expect(mockClerk.invitations.createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ emailAddress: 'ana@club.com' }),
    );
    expect(mockDb.invitacion.update).toHaveBeenCalledWith({
      where: { id: 'inv_1' },
      data: { clerkInvitationId: 'clerk_inv_new', tokenHash: 'hash_tok', expira: expect.any(Date) },
    });
  });

  test('si mientras tanto creó la cuenta, lo suma al club en vez de reenviar', async () => {
    mockDb.invitacion.findFirst.mockResolvedValue(invitacion);
    mockClerk.users.getUserList.mockResolvedValue({ data: [cuentaClerk('user_ana', 'ana@club.com')] });

    const res = await reenviarInvitacion('inv_1');

    expect(res).toEqual({ ok: true });
    expect(mockDb.membresia.create).toHaveBeenCalledWith({
      data: { userId: 'user_ana', clubId: CLUB_TEST.id, rol: 'medico', lugarRetiro: null },
    });
    expect(mockDb.invitacion.update).toHaveBeenCalledWith({
      where: { id: 'inv_1' },
      data: { aceptadaAt: expect.any(Date), aceptadaPor: 'user_ana' },
    });
    expect(mockClerk.invitations.createInvitation).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// deshabilitar / reactivar
// ---------------------------------------------------------------------------

describe('deshabilitarUsuario / reactivarUsuario', () => {
  test('deshabilitar apaga la membresía del club y no banea la cuenta', async () => {
    const res = await deshabilitarUsuario('user_x');

    expect(res).toEqual({ ok: true });
    expect(mockDb.membresia.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user_x' },
      data: { activo: false },
    });
    expectCuentaIntacta();
  });

  test('reactivar prende la membresía y no toca la cuenta', async () => {
    const res = await reactivarUsuario('user_x');

    expect(res).toEqual({ ok: true });
    expect(mockDb.membresia.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user_x' },
      data: { activo: true },
    });
    expectCuentaIntacta();
  });

  test('no se puede deshabilitar ni reactivar a uno mismo', async () => {
    await expect(deshabilitarUsuario(ADMIN)).resolves.toEqual({
      ok: false,
      error: 'No podés deshabilitar tu propia cuenta',
    });
    await expect(reactivarUsuario(ADMIN)).resolves.toEqual({
      ok: false,
      error: 'No podés reactivar tu propia cuenta',
    });
    expect(mockDb.membresia.updateMany).not.toHaveBeenCalled();
  });

  test('un usuario que no es miembro del club: no encontrado', async () => {
    mockDb.membresia.updateMany.mockResolvedValue({ count: 0 });
    await expect(deshabilitarUsuario('user_otro_club')).resolves.toEqual({
      ok: false,
      error: 'Usuario no encontrado',
    });
  });

  test('no se puede deshabilitar al último admin activo', async () => {
    mockDb.membresia.findFirst.mockResolvedValue({ id: 'mem_admin' });
    mockDb.membresia.count.mockResolvedValue(1);

    const res = await deshabilitarUsuario('user_ultimo_admin');

    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/al menos un administrador/i);
    expect(mockDb.membresia.updateMany).not.toHaveBeenCalled();
  });

  test('con otro admin activo, sí se puede deshabilitar a un admin', async () => {
    mockDb.membresia.findFirst.mockResolvedValue({ id: 'mem_admin' });
    mockDb.membresia.count.mockResolvedValue(2);

    await expect(deshabilitarUsuario('user_otro_admin')).resolves.toEqual({ ok: true });
  });
});

// ---------------------------------------------------------------------------
// eliminarUsuario
// ---------------------------------------------------------------------------

describe('eliminarUsuario', () => {
  test.each(['activo', 'inactivo'] as const)(
    'un miembro (%s) se elimina borrando su membresía, sin deleteUser',
    async (status) => {
      const res = await eliminarUsuario('user_x', status);

      expect(res).toEqual({ ok: true });
      expect(mockDb.membresia.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user_x' } });
      expectCuentaIntacta();
    },
  );

  test('una invitación pendiente se revoca en la DB, sin revocar la de Clerk', async () => {
    const res = await eliminarUsuario('inv_1', 'pendiente');

    expect(res).toEqual({ ok: true });
    expect(mockDb.invitacion.updateMany).toHaveBeenCalledWith({
      where: { id: 'inv_1', aceptadaAt: null, revocadaAt: null },
      data: { revocadaAt: expect.any(Date) },
    });
    expect(mockClerk.invitations.revokeInvitation).not.toHaveBeenCalled();
    expect(mockDb.membresia.deleteMany).not.toHaveBeenCalled();
  });

  test('no se puede eliminar a uno mismo', async () => {
    const res = await eliminarUsuario(ADMIN, 'activo');
    expect(res).toEqual({ ok: false, error: 'No podés eliminar tu propia cuenta' });
    expect(mockDb.membresia.deleteMany).not.toHaveBeenCalled();
  });

  test('no se puede eliminar al último admin activo', async () => {
    mockDb.membresia.findFirst.mockResolvedValue({ id: 'mem_admin' });
    mockDb.membresia.count.mockResolvedValue(1);

    const res = await eliminarUsuario('user_ultimo_admin', 'activo');

    expect(res.ok).toBe(false);
    expect(mockDb.membresia.deleteMany).not.toHaveBeenCalled();
  });

  test('invitación ya aceptada o de otro club: no encontrada', async () => {
    mockDb.invitacion.updateMany.mockResolvedValue({ count: 0 });
    await expect(eliminarUsuario('inv_x', 'pendiente')).resolves.toEqual({
      ok: false,
      error: 'Invitación no encontrada',
    });
  });
});

// ---------------------------------------------------------------------------
// cambiarRol / asignarLugarRetiro
// ---------------------------------------------------------------------------

describe('cambiarRol', () => {
  test('escribe el rol en la membresía y limpia el lugar si deja de ser responsable', async () => {
    const res = await cambiarRol('user_x', 'medico');

    expect(res).toEqual({ ok: true });
    expect(mockDb.membresia.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user_x' },
      data: { rol: 'medico', lugarRetiro: null },
    });
    expectCuentaIntacta();
  });

  test('a responsable de viandas no le borra el lugar', async () => {
    await cambiarRol('user_x', 'responsable_viandas');
    expect(mockDb.membresia.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user_x' },
      data: { rol: 'responsable_viandas' },
    });
  });

  test('rechaza un rol no permitido', async () => {
    await expect(cambiarRol('user_x', 'dios')).resolves.toEqual({ ok: false, error: 'Rol no permitido' });
  });

  test('no se puede cambiar el rol propio', async () => {
    await expect(cambiarRol(ADMIN, 'medico')).resolves.toEqual({
      ok: false,
      error: 'No podés cambiar tu propio rol',
    });
  });

  test('no se puede degradar al último admin activo', async () => {
    mockDb.membresia.findFirst.mockResolvedValue({ id: 'mem_admin' });
    mockDb.membresia.count.mockResolvedValue(1);

    const res = await cambiarRol('user_ultimo_admin', 'entrenador');

    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/al menos un administrador/i);
    expect(mockDb.membresia.updateMany).not.toHaveBeenCalled();
  });

  test('pasar a admin no consulta el guard del último admin', async () => {
    await cambiarRol('user_x', 'admin');
    expect(mockDb.membresia.count).not.toHaveBeenCalled();
  });

  test('un superadmin (sin membresía) tampoco puede vaciar el club de admins', async () => {
    setContexto(mockContexto('admin', { userId: 'user_staff', esSuperadmin: true, comoSuperadmin: true }));
    mockDb.membresia.findFirst.mockResolvedValue({ id: 'mem_admin' });
    mockDb.membresia.count.mockResolvedValue(1);

    const res = await cambiarRol('user_ultimo_admin', 'medico');
    expect(res.ok).toBe(false);
  });
});

describe('asignarLugarRetiro', () => {
  test('escribe el lugar en la membresía', async () => {
    const res = await asignarLugarRetiro('user_x', 'SEDE');

    expect(res).toEqual({ ok: true });
    expect(mockDb.membresia.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user_x' },
      data: { lugarRetiro: 'SEDE' },
    });
    expectCuentaIntacta();
  });

  test('null limpia el lugar', async () => {
    await asignarLugarRetiro('user_x', null);
    expect(mockDb.membresia.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user_x' },
      data: { lugarRetiro: null },
    });
  });

  test('rechaza un lugar inválido', async () => {
    const res = await asignarLugarRetiro('user_x', 'MARTE');
    expect(res.ok).toBe(false);
    expect(mockDb.membresia.updateMany).not.toHaveBeenCalled();
  });
});
