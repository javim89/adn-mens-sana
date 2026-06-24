import { describe, test, expect, vi, beforeEach } from 'vitest';

const { mockAuth, mockCurrentUser, mockClerkClient, mockUsersBan, mockUsersUnban, mockUsersDelete, mockInvitationsRevoke } = vi.hoisted(() => {
  const mockAuth = vi.fn().mockResolvedValue({ userId: 'user_admin_123' });

  const mockCurrentUser = vi.fn().mockResolvedValue({
    publicMetadata: { role: 'admin' },
  });

  const mockUsersGetList = vi.fn().mockResolvedValue({ data: [] });
  const mockInvitationsGetList = vi.fn().mockResolvedValue({ data: [] });
  const mockInvitationsCreate = vi.fn().mockResolvedValue({ id: 'inv_new' });
  const mockInvitationsRevoke = vi.fn().mockResolvedValue({ id: 'inv_old' });
  const mockUsersUpdateMetadata = vi.fn().mockResolvedValue({ id: 'user_admin_123' });
  const mockUsersBan = vi.fn().mockResolvedValue({});
  const mockUsersUnban = vi.fn().mockResolvedValue({});
  const mockUsersDelete = vi.fn().mockResolvedValue({});

  const mockClerkClient = vi.fn().mockResolvedValue({
    users: {
      getUserList: mockUsersGetList,
      updateUserMetadata: mockUsersUpdateMetadata,
      banUser: mockUsersBan,
      unbanUser: mockUsersUnban,
      deleteUser: mockUsersDelete,
    },
    invitations: {
      getInvitationList: mockInvitationsGetList,
      createInvitation: mockInvitationsCreate,
      revokeInvitation: mockInvitationsRevoke,
    },
  });

  return { mockAuth, mockCurrentUser, mockClerkClient, mockUsersBan, mockUsersUnban, mockUsersDelete, mockInvitationsRevoke };
});

vi.mock('@clerk/nextjs/server', () => ({
  auth: mockAuth,
  currentUser: mockCurrentUser,
  clerkClient: mockClerkClient,
}));

import { getUsuarios, invitarUsuario, cambiarRol, reenviarInvitacion, deshabilitarUsuario, reactivarUsuario, eliminarUsuario } from '../usuarios';


describe('getUsuarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user_admin_123' });
    mockCurrentUser.mockResolvedValue({ publicMetadata: { role: 'admin' } });
  });

  test('lanza error si el caller no es admin', async () => {
    mockAuth.mockResolvedValueOnce({ userId: 'user_no_admin' });
    mockCurrentUser.mockResolvedValueOnce({ publicMetadata: { role: 'entrenador' } });

    await expect(getUsuarios()).rejects.toThrow(/admin/i);
  });

  test('combina usuarios activos e invitaciones pendientes', async () => {
    mockClerkClient.mockResolvedValueOnce({
      users: {
        getUserList: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'user_1',
              firstName: 'Laura',
              lastName: 'Méndez',
              emailAddresses: [{ emailAddress: 'l.mendez@test.com' }],
              publicMetadata: { role: 'admin' },
              lastSignInAt: 1717459200000,
              createdAt: 1710000000000,
            },
          ],
        }),
        updateUserMetadata: vi.fn(),
      },
      invitations: {
        getInvitationList: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'inv_1',
              emailAddress: 'nuevo@test.com',
              publicMetadata: { role: 'entrenador', firstName: 'Carlos', lastName: 'Ruiz' },
              createdAt: 1717459200000,
              status: 'pending',
            },
          ],
        }),
        createInvitation: vi.fn(),
        revokeInvitation: vi.fn(),
      },
    });

    const result = await getUsuarios();

    expect(result).toHaveLength(2);
    expect(result[0].status).toBe('activo');
    expect(result[0].email).toBe('l.mendez@test.com');
    expect(result[1].status).toBe('pendiente');
    expect(result[1].email).toBe('nuevo@test.com');
    expect(result[1].firstName).toBe('Carlos');
    expect(result[1].lastName).toBe('Ruiz');
  });

  test('activos aparecen antes que pendientes, ordenados por nombre', async () => {
    mockClerkClient.mockResolvedValueOnce({
      users: {
        getUserList: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'user_b',
              firstName: 'Zara',
              lastName: 'Álvarez',
              emailAddresses: [{ emailAddress: 'z@test.com' }],
              publicMetadata: { role: 'medico' },
              lastSignInAt: null,
              createdAt: 1710000000000,
            },
            {
              id: 'user_a',
              firstName: 'Ana',
              lastName: 'García',
              emailAddresses: [{ emailAddress: 'a@test.com' }],
              publicMetadata: { role: 'entrenador' },
              lastSignInAt: null,
              createdAt: 1710000000000,
            },
          ],
        }),
        updateUserMetadata: vi.fn(),
      },
      invitations: {
        getInvitationList: vi.fn().mockResolvedValue({ data: [] }),
        createInvitation: vi.fn(),
        revokeInvitation: vi.fn(),
      },
    });

    const result = await getUsuarios();

    expect(result[0].firstName).toBe('Ana');
    expect(result[1].firstName).toBe('Zara');
    expect(result.every((u) => u.status === 'activo')).toBe(true);
  });

  test('devuelve lastSignInAt como null cuando el usuario nunca inició sesión', async () => {
    mockClerkClient.mockResolvedValueOnce({
      users: {
        getUserList: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'user_1',
              firstName: 'Sin',
              lastName: 'Sesión',
              emailAddresses: [{ emailAddress: 'sin@test.com' }],
              publicMetadata: {},
              lastSignInAt: null,
              createdAt: 1710000000000,
            },
          ],
        }),
        updateUserMetadata: vi.fn(),
      },
      invitations: {
        getInvitationList: vi.fn().mockResolvedValue({ data: [] }),
        createInvitation: vi.fn(),
        revokeInvitation: vi.fn(),
      },
    });

    const result = await getUsuarios();
    const activo = result[0];
    expect(activo.status).toBe('activo');
    if (activo.status === 'activo') {
      expect(activo.lastSignInAt).toBeNull();
    }
  });
});

describe('invitarUsuario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user_admin_123' });
    mockCurrentUser.mockResolvedValue({ publicMetadata: { role: 'admin' } });
    mockClerkClient.mockResolvedValue({
      users: {
        getUserList: vi.fn(),
        updateUserMetadata: vi.fn(),
      },
      invitations: {
        getInvitationList: vi.fn(),
        createInvitation: vi.fn().mockResolvedValue({ id: 'inv_new' }),
        revokeInvitation: vi.fn(),
      },
    });
  });

  test('falla si el caller no es admin', async () => {
    mockAuth.mockResolvedValueOnce({ userId: 'user_no_admin' });
    mockCurrentUser.mockResolvedValueOnce({ publicMetadata: { role: 'entrenador' } });

    const result = await invitarUsuario({
      firstName: 'Juan',
      lastName: 'Pérez',
      email: 'juan@test.com',
      rol: 'entrenador',
    });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/admin/i);
  });

  test('falla si no hay usuario autenticado', async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const result = await invitarUsuario({
      firstName: 'Juan',
      lastName: 'Pérez',
      email: 'juan@test.com',
      rol: 'entrenador',
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe('No autorizado');
  });

  test('llama createInvitation con los datos correctos', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: 'inv_new' });
    mockClerkClient.mockResolvedValueOnce({
      users: { getUserList: vi.fn(), updateUserMetadata: vi.fn() },
      invitations: {
        getInvitationList: vi.fn(),
        createInvitation: mockCreate,
        revokeInvitation: vi.fn(),
      },
    });

    const result = await invitarUsuario({
      firstName: 'María',
      lastName: 'López',
      email: 'maria@test.com',
      rol: 'medico',
    });

    expect(result.ok).toBe(true);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        emailAddress: 'maria@test.com',
        publicMetadata: expect.objectContaining({
          role: 'medico',
          firstName: 'María',
          lastName: 'López',
        }),
      }),
    );
  });

  test('normaliza el email a minúsculas antes de enviar', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: 'inv_new' });
    mockClerkClient.mockResolvedValueOnce({
      users: { getUserList: vi.fn(), updateUserMetadata: vi.fn() },
      invitations: {
        getInvitationList: vi.fn(),
        createInvitation: mockCreate,
        revokeInvitation: vi.fn(),
      },
    });

    await invitarUsuario({
      firstName: 'Juan',
      lastName: 'Test',
      email: '  JUAN@TEST.COM  ',
      rol: 'medico',
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ emailAddress: 'juan@test.com' }),
    );
  });

  test('rechaza rol arbitrario no incluido en ROLES_PERMITIDOS', async () => {
    const result = await invitarUsuario({
      firstName: 'Hack',
      lastName: 'Er',
      email: 'hack@test.com',
      rol: 'superadmin',
    });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/rol no permitido/i);
  });

  test('acepta kinesiologo como rol válido', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: 'inv_kine' });
    mockClerkClient.mockResolvedValueOnce({
      users: { getUserList: vi.fn(), updateUserMetadata: vi.fn() },
      invitations: {
        getInvitationList: vi.fn(),
        createInvitation: mockCreate,
        revokeInvitation: vi.fn(),
      },
    });

    const result = await invitarUsuario({
      firstName: 'Clara',
      lastName: 'Ríos',
      email: 'clara@test.com',
      rol: 'kinesiologo',
    });

    expect(result.ok).toBe(true);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        publicMetadata: expect.objectContaining({ role: 'kinesiologo' }),
      }),
    );
  });
});

describe('cambiarRol', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user_admin_123' });
    mockCurrentUser.mockResolvedValue({ publicMetadata: { role: 'admin' } });
    mockClerkClient.mockResolvedValue({
      users: {
        getUserList: vi.fn(),
        updateUserMetadata: vi.fn().mockResolvedValue({ id: 'user_target' }),
      },
      invitations: {
        getInvitationList: vi.fn(),
        createInvitation: vi.fn(),
        revokeInvitation: vi.fn(),
      },
    });
  });

  test('falla si el caller no es admin', async () => {
    mockAuth.mockResolvedValueOnce({ userId: 'user_no_admin' });
    mockCurrentUser.mockResolvedValueOnce({ publicMetadata: { role: 'medico' } });

    const result = await cambiarRol('user_target', 'entrenador');

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/admin/i);
  });

  test('actualiza publicMetadata con el nuevo rol', async () => {
    const mockUpdateMetadata = vi.fn().mockResolvedValue({ id: 'user_target' });
    mockClerkClient.mockResolvedValueOnce({
      users: { getUserList: vi.fn(), updateUserMetadata: mockUpdateMetadata },
      invitations: {
        getInvitationList: vi.fn(),
        createInvitation: vi.fn(),
        revokeInvitation: vi.fn(),
      },
    });

    const result = await cambiarRol('user_target', 'entrenador');

    expect(result.ok).toBe(true);
    expect(mockUpdateMetadata).toHaveBeenCalledWith('user_target', {
      publicMetadata: { role: 'entrenador' },
    });
  });

  test('retorna error si updateUserMetadata lanza excepción', async () => {
    mockClerkClient.mockResolvedValueOnce({
      users: {
        getUserList: vi.fn(),
        updateUserMetadata: vi.fn().mockRejectedValue(new Error('User not found')),
      },
      invitations: {
        getInvitationList: vi.fn(),
        createInvitation: vi.fn(),
        revokeInvitation: vi.fn(),
      },
    });

    const result = await cambiarRol('user_inexistente', 'admin');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('User not found');
  });

  test('rechaza rol arbitrario no incluido en ROLES_PERMITIDOS', async () => {
    const result = await cambiarRol('user_target', 'god');

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/rol no permitido/i);
  });

  test('impide que el admin cambie su propio rol', async () => {
    const result = await cambiarRol('user_admin_123', 'entrenador');

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/propio rol/i);
  });

  test('acepta nutricionista como rol válido al cambiar rol', async () => {
    const mockUpdateMetadata = vi.fn().mockResolvedValue({ id: 'user_target' });
    mockClerkClient.mockResolvedValueOnce({
      users: { getUserList: vi.fn(), updateUserMetadata: mockUpdateMetadata },
      invitations: {
        getInvitationList: vi.fn(),
        createInvitation: vi.fn(),
        revokeInvitation: vi.fn(),
      },
    });

    const result = await cambiarRol('user_target', 'nutricionista');

    expect(result.ok).toBe(true);
    expect(mockUpdateMetadata).toHaveBeenCalledWith('user_target', {
      publicMetadata: { role: 'nutricionista' },
    });
  });
});

describe('reenviarInvitacion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user_admin_123' });
    mockCurrentUser.mockResolvedValue({ publicMetadata: { role: 'admin' } });
  });

  test('falla si el caller no es admin', async () => {
    mockAuth.mockResolvedValueOnce({ userId: 'user_no_admin' });
    mockCurrentUser.mockResolvedValueOnce({ publicMetadata: { role: 'entrenador' } });

    const result = await reenviarInvitacion('inv_123');

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/admin/i);
  });

  test('revoca y recrea la invitación con los mismos datos', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: 'inv_new' });
    const mockRevoke = vi.fn().mockResolvedValue({ id: 'inv_123' });
    const mockGetList = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'inv_123',
          emailAddress: 'usuario@test.com',
          publicMetadata: { role: 'medico', firstName: 'Test', lastName: 'User' },
          createdAt: 1710000000000,
          status: 'pending',
        },
      ],
    });

    mockClerkClient.mockResolvedValue({
      users: { getUserList: vi.fn(), updateUserMetadata: vi.fn() },
      invitations: {
        getInvitationList: mockGetList,
        createInvitation: mockCreate,
        revokeInvitation: mockRevoke,
      },
    });

    const result = await reenviarInvitacion('inv_123');

    expect(result.ok).toBe(true);
    expect(mockRevoke).toHaveBeenCalledWith('inv_123');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        emailAddress: 'usuario@test.com',
        publicMetadata: expect.objectContaining({ role: 'medico' }),
      }),
    );
  });
});

describe('getUsuarios — disabled field', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user_admin_123' });
    mockCurrentUser.mockResolvedValue({ publicMetadata: { role: 'admin' } });
  });

  const makeUserClient = (banned: boolean) => ({
    users: {
      getUserList: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'user_1',
            firstName: 'Test',
            lastName: 'User',
            emailAddresses: [{ emailAddress: 't@test.com' }],
            publicMetadata: { role: 'entrenador' },
            lastSignInAt: null,
            createdAt: 1710000000000,
            banned,
          },
        ],
      }),
      updateUserMetadata: vi.fn(),
      banUser: vi.fn(),
      unbanUser: vi.fn(),
      deleteUser: vi.fn(),
    },
    invitations: {
      getInvitationList: vi.fn().mockResolvedValue({ data: [] }),
      createInvitation: vi.fn(),
      revokeInvitation: vi.fn(),
    },
  });

  test('expone disabled: false para usuario no baneado', async () => {
    mockClerkClient.mockResolvedValueOnce(makeUserClient(false));
    const result = await getUsuarios();
    expect(result[0].status).toBe('activo');
    if (result[0].status === 'activo') {
      expect(result[0].disabled).toBe(false);
    }
  });

  test('expone disabled: true para usuario baneado', async () => {
    mockClerkClient.mockResolvedValueOnce(makeUserClient(true));
    const result = await getUsuarios();
    expect(result[0].status).toBe('activo');
    if (result[0].status === 'activo') {
      expect(result[0].disabled).toBe(true);
    }
  });
});

describe('deshabilitarUsuario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user_admin_123' });
    mockCurrentUser.mockResolvedValue({ publicMetadata: { role: 'admin' } });
    mockClerkClient.mockResolvedValue({
      users: {
        getUserList: vi.fn(),
        updateUserMetadata: vi.fn(),
        banUser: mockUsersBan,
        unbanUser: mockUsersUnban,
        deleteUser: mockUsersDelete,
      },
      invitations: {
        getInvitationList: vi.fn(),
        createInvitation: vi.fn(),
        revokeInvitation: mockInvitationsRevoke,
      },
    });
  });

  test('falla si el caller no es admin', async () => {
    mockAuth.mockResolvedValueOnce({ userId: 'user_no_admin' });
    mockCurrentUser.mockResolvedValueOnce({ publicMetadata: { role: 'entrenador' } });

    const result = await deshabilitarUsuario('user_target');

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/admin/i);
  });

  test('falla si el userId es el propio admin', async () => {
    const result = await deshabilitarUsuario('user_admin_123');

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/propia cuenta/i);
  });

  test('llama banUser con el userId correcto', async () => {
    const result = await deshabilitarUsuario('user_target');

    expect(result.ok).toBe(true);
    expect(mockUsersBan).toHaveBeenCalledWith('user_target');
  });

  test('retorna error si banUser lanza excepción', async () => {
    mockUsersBan.mockRejectedValueOnce(new Error('Clerk ban failed'));

    const result = await deshabilitarUsuario('user_target');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('Clerk ban failed');
  });
});

describe('reactivarUsuario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user_admin_123' });
    mockCurrentUser.mockResolvedValue({ publicMetadata: { role: 'admin' } });
    mockClerkClient.mockResolvedValue({
      users: {
        getUserList: vi.fn(),
        updateUserMetadata: vi.fn(),
        banUser: mockUsersBan,
        unbanUser: mockUsersUnban,
        deleteUser: mockUsersDelete,
      },
      invitations: {
        getInvitationList: vi.fn(),
        createInvitation: vi.fn(),
        revokeInvitation: mockInvitationsRevoke,
      },
    });
  });

  test('falla si el caller no es admin', async () => {
    mockAuth.mockResolvedValueOnce({ userId: 'user_no_admin' });
    mockCurrentUser.mockResolvedValueOnce({ publicMetadata: { role: 'entrenador' } });

    const result = await reactivarUsuario('user_target');

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/admin/i);
  });

  test('falla si el userId es el propio admin', async () => {
    const result = await reactivarUsuario('user_admin_123');

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/propia cuenta/i);
  });

  test('llama unbanUser con el userId correcto', async () => {
    const result = await reactivarUsuario('user_target');

    expect(result.ok).toBe(true);
    expect(mockUsersUnban).toHaveBeenCalledWith('user_target');
  });

  test('retorna error si unbanUser lanza excepción', async () => {
    mockUsersUnban.mockRejectedValueOnce(new Error('Clerk unban failed'));

    const result = await reactivarUsuario('user_target');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('Clerk unban failed');
  });
});

describe('eliminarUsuario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user_admin_123' });
    mockCurrentUser.mockResolvedValue({ publicMetadata: { role: 'admin' } });
    mockClerkClient.mockResolvedValue({
      users: {
        getUserList: vi.fn(),
        updateUserMetadata: vi.fn(),
        banUser: mockUsersBan,
        unbanUser: mockUsersUnban,
        deleteUser: mockUsersDelete,
      },
      invitations: {
        getInvitationList: vi.fn(),
        createInvitation: vi.fn(),
        revokeInvitation: mockInvitationsRevoke,
      },
    });
  });

  test('falla si el caller no es admin', async () => {
    mockAuth.mockResolvedValueOnce({ userId: 'user_no_admin' });
    mockCurrentUser.mockResolvedValueOnce({ publicMetadata: { role: 'entrenador' } });

    const result = await eliminarUsuario('user_target', 'activo');

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/admin/i);
  });

  test('falla si el admin intenta eliminarse a sí mismo (status activo)', async () => {
    const result = await eliminarUsuario('user_admin_123', 'activo');

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/propia cuenta/i);
  });

  test('llama deleteUser para usuario activo', async () => {
    const result = await eliminarUsuario('user_target', 'activo');

    expect(result.ok).toBe(true);
    expect(mockUsersDelete).toHaveBeenCalledWith('user_target');
  });

  test('llama revokeInvitation para invitación pendiente', async () => {
    const result = await eliminarUsuario('inv_123', 'pendiente');

    expect(result.ok).toBe(true);
    expect(mockInvitationsRevoke).toHaveBeenCalledWith('inv_123');
  });

  test('no aplica self-guard para invitaciones pendientes', async () => {
    // Even if the id matches the admin's userId, pending invitations are not user accounts
    const result = await eliminarUsuario('user_admin_123', 'pendiente');

    expect(result.ok).toBe(true);
    expect(mockInvitationsRevoke).toHaveBeenCalledWith('user_admin_123');
  });

  test('retorna error si deleteUser lanza excepción', async () => {
    mockUsersDelete.mockRejectedValueOnce(new Error('Clerk delete failed'));

    const result = await eliminarUsuario('user_target', 'activo');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('Clerk delete failed');
  });

  test('retorna error si revokeInvitation lanza excepción', async () => {
    mockInvitationsRevoke.mockRejectedValueOnce(new Error('Clerk revoke failed'));

    const result = await eliminarUsuario('inv_123', 'pendiente');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('Clerk revoke failed');
  });
});
