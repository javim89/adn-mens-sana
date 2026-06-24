'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Loader2, ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { toast } from 'sonner';
import { useUser } from '@clerk/nextjs';
import { reenviarInvitacion, cambiarRol, deshabilitarUsuario, reactivarUsuario, eliminarUsuario } from '@/lib/actions/usuarios';
import { ROLES_PERMITIDOS, ROL_LABELS } from '@/lib/roles';
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
  admin:         'bg-[#121A61] text-white',
  entrenador:    'bg-[#C9A84C] text-[#1C1C1C]',
  medico:        'bg-[#3346CC] text-white',
  kinesiologo:   'bg-[#0F766E] text-white',
  nutricionista: 'bg-[#7C3AED] text-white',
  psicologo:     'bg-[#B45309] text-white',
  cardiologo:    'bg-[#DC2626] text-white',
};

function RolBadge({ rol }: { rol: string }) {
  const classes = ROL_BADGE[rol] ?? 'bg-gray-100 text-[#6B7280]';
  const label = (ROL_LABELS as Record<string, string>)[rol] ?? (rol || '—');
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${classes}`}>
      {label}
    </span>
  );
}

interface UsuarioAccionesProps {
  usuario: Usuario;
  isAdmin: boolean;
  currentUserId: string | undefined;
  openConfirm: (action: 'deshabilitar' | 'reactivar' | 'eliminar', usuario: Usuario) => void;
}

function UsuarioAcciones({ usuario, isAdmin, currentUserId, openConfirm }: UsuarioAccionesProps) {
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function handleToggle() {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setOpen((v) => !v);
  }

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent) {
        if (e.key === 'Escape') setOpen(false);
        return;
      }
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleScroll() { setOpen(false); }
    document.addEventListener('mousedown', handle);
    document.addEventListener('keydown', handle);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handle);
      document.removeEventListener('keydown', handle);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);

  if (!isAdmin) return null;

  const showReenviar = usuario.status === 'pendiente';
  const showDeshabilitar =
    usuario.status === 'activo' && !usuario.disabled && usuario.id !== currentUserId;
  const showReactivar = usuario.status === 'activo' && usuario.disabled;

  function handleResend() {
    setOpen(false);
    startTransition(async () => {
      const result = await reenviarInvitacion(usuario.id);
      if (result.ok) {
        toast.success('Invitación reenviada');
        router.refresh();
      } else {
        toast.error(result.error ?? 'Error al reenviar la invitación');
      }
    });
  }

  const ITEM_BASE =
    'flex items-center gap-2 w-full px-4 py-2 text-sm text-left text-[#1C1C1C] hover:bg-[#F3F4F6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
  const ITEM_DESTRUCTIVE =
    'flex items-center gap-2 w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        ref={triggerRef}
        onClick={handleToggle}
        disabled={isPending}
        aria-haspopup="true"
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg bg-white text-[#1C1C1C] hover:bg-[#F3F4F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3346CC]/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${open ? 'border-[#121A61]' : 'border-gray-200'}`}
      >
        Acciones
        {isPending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <ChevronDown
            size={16}
            className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {open && (
        <div
          style={{ top: dropdownPos.top, right: dropdownPos.right }}
          className="fixed z-50 w-44 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
        >
          {showReenviar && (
            <button
              onClick={handleResend}
              disabled={isPending}
              className={ITEM_BASE}
            >
              <Mail size={14} />
              Reenviar invitación
            </button>
          )}
          {showDeshabilitar && (
            <button
              onClick={() => { setOpen(false); openConfirm('deshabilitar', usuario); }}
              className={ITEM_BASE}
            >
              Deshabilitar
            </button>
          )}
          {showReactivar && (
            <button
              onClick={() => { setOpen(false); openConfirm('reactivar', usuario); }}
              className={ITEM_BASE}
            >
              Reactivar
            </button>
          )}
          <div className="border-t border-gray-100" />
          <button
            onClick={() => { setOpen(false); openConfirm('eliminar', usuario); }}
            className={ITEM_DESTRUCTIVE}
          >
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
}

function RolSelector({ userId, currentRol }: { userId: string; currentRol: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleChange(nuevoRol: string) {
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
    <Select
      value={currentRol}
      onValueChange={handleChange}
      disabled={isPending}
    >
      <SelectTrigger className="h-8 text-xs px-2 w-full" aria-label="Cambiar rol">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES_PERMITIDOS.map((rol) => (
          <SelectItem key={rol} value={rol}>
            {ROL_LABELS[rol]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function EstadoBadge({ usuario }: { usuario: Usuario }) {
  if (usuario.status === 'activo' && usuario.disabled) {
    return (
      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700">
        Deshabilitado
      </span>
    );
  }
  if (usuario.status === 'activo') {
    return (
      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
        Activo
      </span>
    );
  }
  return (
    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
      Pendiente
    </span>
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

        {/* Mobile card list — hidden on lg+ */}
        <ul className="lg:hidden divide-y divide-gray-100">
          {usuarios.length === 0 ? (
            <li className="px-4 py-12 text-center text-sm text-[#6B7280]">
              No hay usuarios registrados
            </li>
          ) : (
            usuarios.map((usuario) => {
              const isDisabled = usuario.status === 'activo' && usuario.disabled;
              return (
                <li
                  key={usuario.id}
                  className={`px-4 py-4 flex flex-col gap-2${isDisabled ? ' opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-[#1C1C1C]">
                        {usuario.firstName} {usuario.lastName}
                      </p>
                      <p className="text-xs text-[#6B7280] mt-0.5">{usuario.email}</p>
                    </div>
                    <UsuarioAcciones
                      usuario={usuario}
                      isAdmin={!!isAdmin}
                      currentUserId={currentUserId}
                      openConfirm={openConfirm}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <RolBadge rol={usuario.rol} />
                    <EstadoBadge usuario={usuario} />
                  </div>
                  {isAdmin && usuario.status === 'activo' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#6B7280]">Rol:</span>
                      <RolSelector userId={usuario.id} currentRol={usuario.rol} />
                    </div>
                  )}
                  <p className="text-xs text-[#6B7280]">
                    Último ingreso:{' '}
                    {usuario.status === 'activo' ? formatLastSignIn(usuario.lastSignInAt) : '—'}
                  </p>
                </li>
              );
            })
          )}
        </ul>

        {/* Desktop table — hidden below lg */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs uppercase text-[#6B7280] bg-[#F3F4F6] border-b border-gray-100">
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Rol</th>
                <th className="hidden xl:table-cell px-4 py-3 text-left">Último ingreso</th>
                <th className="px-4 py-3 text-left">Estado</th>
                {isAdmin && <th className="hidden xl:table-cell px-4 py-3 text-left">Cambiar rol</th>}
                <th className="px-4 py-3 text-left">Acciones</th>
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
                      <td className="px-4 py-3.5 text-sm font-medium text-[#1C1C1C]">
                        {usuario.firstName} {usuario.lastName}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-[#6B7280]">{usuario.email}</td>
                      <td className="px-4 py-3.5">
                        <RolBadge rol={usuario.rol} />
                      </td>
                      <td className="hidden xl:table-cell px-4 py-3.5 text-sm text-[#6B7280]">
                        {usuario.status === 'activo'
                          ? formatLastSignIn(usuario.lastSignInAt)
                          : '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <EstadoBadge usuario={usuario} />
                      </td>
                      {isAdmin && (
                        <td className="hidden xl:table-cell px-4 py-3.5">
                          {usuario.status === 'activo' ? (
                            <RolSelector userId={usuario.id} currentRol={usuario.rol} />
                          ) : (
                            <span className="text-xs text-[#6B7280]">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3.5">
                        <UsuarioAcciones
                          usuario={usuario}
                          isAdmin={!!isAdmin}
                          currentUserId={currentUserId}
                          openConfirm={openConfirm}
                        />
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
