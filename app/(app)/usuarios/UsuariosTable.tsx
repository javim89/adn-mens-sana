'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Loader2, Ban, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@clerk/nextjs';
import { reenviarInvitacion, cambiarRol, deshabilitarUsuario, reactivarUsuario, eliminarUsuario } from '@/lib/actions/usuarios';
import { ROLES_PERMITIDOS } from '@/lib/roles';
import type { Usuario } from '@/lib/types/usuarios';
import ConfirmarAccionModal from './ConfirmarAccionModal';

function formatLastSignIn(date: Date | null): string {
  if (!date) return '—';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Hace 1 día';
  if (diffDays < 30) return `Hace ${diffDays} días`;

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

const ROL_BADGE: Record<string, string> = {
  admin: 'bg-[#121A61] text-white',
  entrenador: 'bg-[#C9A84C] text-[#1C1C1C]',
  medico: 'bg-[#3346CC] text-white',
};

function RolBadge({ rol }: { rol: string }) {
  const classes = ROL_BADGE[rol] ?? 'bg-gray-100 text-[#6B7280]';
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${classes}`}>
      {rol || '—'}
    </span>
  );
}

function ResendButton({ invitationId }: { invitationId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleResend() {
    startTransition(async () => {
      const result = await reenviarInvitacion(invitationId);
      if (result.ok) {
        toast.success('Invitación reenviada');
        router.refresh();
      } else {
        toast.error(result.error ?? 'Error al reenviar la invitación');
      }
    });
  }

  return (
    <button
      onClick={handleResend}
      disabled={isPending}
      title="Reenviar invitación"
      className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#121A61] border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? (
        <Loader2 size={13} className="animate-spin" />
      ) : (
        <Mail size={13} />
      )}
      Reenviar
    </button>
  );
}

function RolSelector({ userId, currentRol }: { userId: string; currentRol: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nuevoRol = e.target.value;
    startTransition(async () => {
      const result = await cambiarRol(userId, nuevoRol);
      if (result.ok) {
        toast.success('Rol actualizado');
        router.refresh();
      } else {
        toast.error(result.error ?? 'Error al actualizar el rol');
      }
    });
  }

  return (
    <div className="relative">
      {isPending && (
        <Loader2
          size={12}
          className="animate-spin absolute right-2 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none"
        />
      )}
      <select
        value={currentRol}
        onChange={handleChange}
        disabled={isPending}
        aria-label="Cambiar rol"
        className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30 text-[#1C1C1C] disabled:opacity-50 pr-6"
      >
        {ROLES_PERMITIDOS.map((rol) => (
          <option key={rol} value={rol}>
            {rol}
          </option>
        ))}
      </select>
    </div>
  );
}

interface UsuariosTableProps {
  usuarios: Usuario[];
}

type ConfirmModalState = {
  open: boolean;
  action: 'deshabilitar' | 'reactivar' | 'eliminar' | null;
  usuario: Usuario | null;
};

export default function UsuariosTable({ usuarios }: UsuariosTableProps) {
  const { user, isLoaded } = useUser();
  const isAdmin = isLoaded && user?.publicMetadata?.role === 'admin';
  const currentUserId = user?.id;

  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    open: false,
    action: null,
    usuario: null,
  });

  function openConfirm(action: ConfirmModalState['action'], usuario: Usuario) {
    setConfirmModal({ open: true, action, usuario });
  }

  function closeConfirm() {
    setConfirmModal({ open: false, action: null, usuario: null });
  }

  function handleConfirm() {
    const { action, usuario } = confirmModal;
    if (!action || !usuario) return;

    startTransition(async () => {
      let result: { ok: boolean; error?: string };

      if (action === 'deshabilitar') {
        result = await deshabilitarUsuario(usuario.id);
      } else if (action === 'reactivar') {
        result = await reactivarUsuario(usuario.id);
      } else {
        result = await eliminarUsuario(usuario.id, usuario.status);
      }

      if (result.ok) {
        if (action === 'deshabilitar') {
          toast.success('Usuario deshabilitado');
        } else if (action === 'reactivar') {
          toast.success('Usuario reactivado');
        } else if (usuario.status === 'activo') {
          toast.success('Usuario eliminado');
        } else {
          toast.success('Invitación revocada');
        }
        closeConfirm();
        router.refresh();
      } else {
        toast.error(result.error ?? 'Ocurrió un error');
      }
    });
  }

  function getModalProps(state: ConfirmModalState) {
    const { action, usuario } = state;
    const nombre = usuario ? `${usuario.firstName} ${usuario.lastName}` : '';

    if (action === 'deshabilitar') {
      return {
        title: 'Deshabilitar usuario',
        description: `¿Seguro que querés deshabilitar a ${nombre}? No podrá iniciar sesión hasta que sea reactivado.`,
        confirmLabel: 'Deshabilitar',
        danger: true,
      };
    }
    if (action === 'reactivar') {
      return {
        title: 'Reactivar usuario',
        description: `¿Seguro que querés reactivar a ${nombre}? Recuperará acceso para iniciar sesión.`,
        confirmLabel: 'Reactivar',
        danger: false,
      };
    }
    if (usuario?.status === 'pendiente') {
      return {
        title: 'Eliminar invitación',
        description: `¿Seguro que querés eliminar la invitación de ${nombre}? Esta acción no se puede deshacer.`,
        confirmLabel: 'Eliminar',
        danger: true,
      };
    }
    return {
      title: 'Eliminar usuario',
      description: `¿Seguro que querés eliminar a ${nombre}? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      danger: true,
    };
  }

  const modalProps = getModalProps(confirmModal);

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs uppercase text-[#6B7280] bg-[#F3F4F6] border-b border-gray-100">
                <th className="px-5 py-3 text-left">Nombre</th>
                <th className="px-5 py-3 text-left">Email</th>
                <th className="px-5 py-3 text-left">Rol</th>
                <th className="px-5 py-3 text-left">Último ingreso</th>
                <th className="px-5 py-3 text-left">Estado</th>
                {isAdmin && <th className="px-5 py-3 text-left">Cambiar rol</th>}
                <th className="px-5 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 7 : 6}
                    className="px-5 py-12 text-center text-sm text-[#6B7280]"
                  >
                    No hay usuarios registrados
                  </td>
                </tr>
              ) : (
                usuarios.map((usuario) => {
                  const isDisabled = usuario.status === 'activo' && usuario.disabled;
                  return (
                    <tr
                      key={usuario.id}
                      className={`border-b border-gray-50 hover:bg-[#F3F4F6] transition-colors${isDisabled ? ' opacity-60' : ''}`}
                    >
                      <td className="px-5 py-3.5 text-sm font-medium text-[#1C1C1C]">
                        {usuario.firstName} {usuario.lastName}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[#6B7280]">{usuario.email}</td>
                      <td className="px-5 py-3.5">
                        <RolBadge rol={usuario.rol} />
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[#6B7280]">
                        {usuario.status === 'activo'
                          ? formatLastSignIn(usuario.lastSignInAt)
                          : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        {usuario.status === 'activo' && usuario.disabled ? (
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                            Deshabilitado
                          </span>
                        ) : usuario.status === 'activo' ? (
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                            Activo
                          </span>
                        ) : (
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                            Pendiente
                          </span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-3.5">
                          {usuario.status === 'activo' ? (
                            <RolSelector userId={usuario.id} currentRol={usuario.rol} />
                          ) : (
                            <span className="text-xs text-[#6B7280]">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isAdmin && usuario.status === 'pendiente' && (
                            <ResendButton invitationId={usuario.id} />
                          )}
                          {isAdmin && usuario.status === 'activo' && !usuario.disabled && usuario.id !== currentUserId && (
                            <button
                              onClick={() => openConfirm('deshabilitar', usuario)}
                              title="Deshabilitar usuario"
                              className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#121A61] border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors"
                            >
                              <Ban size={13} />
                              Deshabilitar
                            </button>
                          )}
                          {isAdmin && usuario.status === 'activo' && usuario.disabled && (
                            <button
                              onClick={() => openConfirm('reactivar', usuario)}
                              title="Reactivar usuario"
                              className="flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700 border border-green-200 hover:border-green-300 rounded-lg px-2.5 py-1.5 transition-colors"
                            >
                              <ShieldCheck size={13} />
                              Reactivar
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => openConfirm('eliminar', usuario)}
                              title="Eliminar"
                              className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-lg px-2.5 py-1.5 transition-colors"
                            >
                              <Trash2 size={13} />
                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmarAccionModal
        open={confirmModal.open}
        title={modalProps.title}
        description={modalProps.description}
        confirmLabel={modalProps.confirmLabel}
        isPending={isPending}
        danger={modalProps.danger}
        onConfirm={handleConfirm}
        onCancel={closeConfirm}
      />
    </>
  );
}
