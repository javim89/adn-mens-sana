'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import type { Usuario, UsuarioActivo, UsuarioPendiente } from '@/lib/types/usuarios';
import { ROLES_PERMITIDOS } from '@/lib/roles';

async function assertAdmin(): Promise<{ ok: false; error: string } | { ok: true; userId: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: 'No autorizado' };
  const user = await currentUser();
  const role = user?.publicMetadata?.role;
  if (role !== 'admin') return { ok: false, error: 'Acceso denegado: se requiere rol admin' };
  return { ok: true, userId };
}

export async function getUsuarios(): Promise<Usuario[]> {
  const check = await assertAdmin();
  if (!check.ok) throw new Error(check.error);

  const client = await clerkClient();

  const [usersResponse, invitationsResponse] = await Promise.all([
    client.users.getUserList({ limit: 100 }),
    client.invitations.getInvitationList({ status: 'pending', limit: 100 }),
  ]);

  const activos: UsuarioActivo[] = usersResponse.data.map((u) => {
    const meta = (u.publicMetadata ?? {}) as Record<string, unknown>;
    return {
      id: u.id,
      firstName: u.firstName || String(meta.firstName ?? ''),
      lastName: u.lastName || String(meta.lastName ?? ''),
      email: u.emailAddresses[0]?.emailAddress ?? '',
      rol: String(meta.role ?? ''),
      lastSignInAt: u.lastSignInAt != null ? new Date(u.lastSignInAt) : null,
      createdAt: new Date(u.createdAt),
      status: 'activo' as const,
      disabled: u.banned === true,
    };
  });

  const pendientes: UsuarioPendiente[] = invitationsResponse.data.map((inv) => {
    const meta = (inv.publicMetadata ?? {}) as Record<string, unknown>;
    return {
      id: inv.id,
      firstName: String(meta.firstName ?? ''),
      lastName: String(meta.lastName ?? ''),
      email: inv.emailAddress,
      rol: String(meta.role ?? ''),
      createdAt: new Date(inv.createdAt),
      status: 'pendiente' as const,
    };
  });

  activos.sort((a, b) =>
    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
  );

  return [...activos, ...pendientes];
}

export async function invitarUsuario(data: {
  firstName: string;
  lastName: string;
  email: string;
  rol: string;
}): Promise<{ ok: boolean; error?: string }> {
  const check = await assertAdmin();
  if (!check.ok) return { ok: false, error: check.error };

  if (!ROLES_PERMITIDOS.includes(data.rol as (typeof ROLES_PERMITIDOS)[number])) {
    return { ok: false, error: 'Rol no permitido' };
  }

  try {
    const client = await clerkClient();
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/sign-up`;
    const normalizedEmail = data.email.toLowerCase().trim();

    await client.invitations.createInvitation({
      emailAddress: normalizedEmail,
      publicMetadata: {
        role: data.rol,
        firstName: data.firstName,
        lastName: data.lastName,
      },
      redirectUrl,
    });

    return { ok: true };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.toLowerCase().includes('already')) {
        return { ok: false, error: 'Ya existe una invitación o cuenta para ese email' };
      }
      return { ok: false, error: error.message };
    }
    return { ok: false, error: 'Error al enviar la invitación' };
  }
}

export async function reenviarInvitacion(
  invitationId: string,
): Promise<{ ok: boolean; error?: string }> {
  const check = await assertAdmin();
  if (!check.ok) return { ok: false, error: check.error };

  try {
    const client = await clerkClient();

    const existing = await client.invitations.getInvitationList({
      query: invitationId,
      limit: 1,
    });

    const invitation = existing.data.find((inv) => inv.id === invitationId);
    if (!invitation) return { ok: false, error: 'Invitación no encontrada' };

    const meta = (invitation.publicMetadata ?? {}) as Record<string, unknown>;

    await client.invitations.revokeInvitation(invitationId);

    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/sign-up`;

    await client.invitations.createInvitation({
      emailAddress: invitation.emailAddress,
      publicMetadata: meta,
      redirectUrl,
    });

    return { ok: true };
  } catch (error) {
    if (error instanceof Error) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: 'Error al reenviar la invitación' };
  }
}

export async function deshabilitarUsuario(
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  const check = await assertAdmin();
  if (!check.ok) return { ok: false, error: check.error };

  if (check.userId === userId) {
    return { ok: false, error: 'No podés deshabilitar tu propia cuenta' };
  }

  try {
    const client = await clerkClient();
    await client.users.banUser(userId);
    return { ok: true };
  } catch (error) {
    if (error instanceof Error) return { ok: false, error: error.message };
    return { ok: false, error: 'Error al deshabilitar el usuario' };
  }
}

export async function reactivarUsuario(
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  const check = await assertAdmin();
  if (!check.ok) return { ok: false, error: check.error };

  if (check.userId === userId) {
    return { ok: false, error: 'No podés reactivar tu propia cuenta' };
  }

  try {
    const client = await clerkClient();
    await client.users.unbanUser(userId);
    return { ok: true };
  } catch (error) {
    if (error instanceof Error) return { ok: false, error: error.message };
    return { ok: false, error: 'Error al reactivar el usuario' };
  }
}

export async function eliminarUsuario(
  id: string,
  status: 'activo' | 'pendiente',
): Promise<{ ok: boolean; error?: string }> {
  const check = await assertAdmin();
  if (!check.ok) return { ok: false, error: check.error };

  if (status === 'activo' && check.userId === id) {
    return { ok: false, error: 'No podés eliminar tu propia cuenta' };
  }

  try {
    const client = await clerkClient();

    if (status === 'activo') {
      await client.users.deleteUser(id);
    } else {
      await client.invitations.revokeInvitation(id);
    }

    return { ok: true };
  } catch (error) {
    if (error instanceof Error) return { ok: false, error: error.message };
    return { ok: false, error: 'Error al eliminar el usuario' };
  }
}

export async function cambiarRol(
  userId: string,
  nuevoRol: string,
): Promise<{ ok: boolean; error?: string }> {
  const check = await assertAdmin();
  if (!check.ok) return { ok: false, error: check.error };

  if (check.userId === userId) {
    return { ok: false, error: 'No podés cambiar tu propio rol' };
  }

  if (!ROLES_PERMITIDOS.includes(nuevoRol as (typeof ROLES_PERMITIDOS)[number])) {
    return { ok: false, error: 'Rol no permitido' };
  }

  try {
    const client = await clerkClient();

    await client.users.updateUserMetadata(userId, {
      publicMetadata: { role: nuevoRol },
    });

    return { ok: true };
  } catch (error) {
    if (error instanceof Error) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: 'Error al actualizar el rol' };
  }
}
