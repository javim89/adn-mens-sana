'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@clerk/nextjs';
import { reenviarInvitacion, cambiarRol } from '@/lib/actions/usuarios';
import { ROLES_PERMITIDOS } from '@/lib/roles';
import type { Usuario } from '@/lib/types/usuarios';

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

export default function UsuariosTable({ usuarios }: UsuariosTableProps) {
  const { user, isLoaded } = useUser();
  const isAdmin =
    isLoaded && user?.publicMetadata?.role === 'admin';

  return (
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
              usuarios.map((usuario) => (
                <tr
                  key={usuario.id}
                  className="border-b border-gray-50 hover:bg-[#F3F4F6] transition-colors"
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
                    {usuario.status === 'activo' ? (
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
                    {isAdmin && usuario.status === 'pendiente' && (
                      <ResendButton invitationId={usuario.id} />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
