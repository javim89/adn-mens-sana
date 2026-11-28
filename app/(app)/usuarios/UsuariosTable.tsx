'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, Loader2, Mail, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar } from '@/app/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Panel } from '@/app/components/ui/panel';
import { reenviarInvitacion, cambiarRol, asignarLugarRetiro, deshabilitarUsuario, reactivarUsuario, eliminarUsuario } from '@/lib/actions/usuarios';
import { ROLES_PERMITIDOS, ROL_LABELS } from '@/lib/roles';
import { hoyEnArgentina, sumarDiasClave } from '@/lib/utils/fecha';
import { LUGARES_RETIRO } from '@/lib/utils/viandas';
import { LUGAR_RETIRO_LABELS } from '@/lib/utils/enum-labels';
import { esInvitacion, type Usuario } from '@/lib/types/usuarios';
import ConfirmarAccionModal from './ConfirmarAccionModal';


const PILDORA =
  'inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium';

/**
 * "Hoy" / "Ayer" / `d/m` (con el año si no es el actual), por día calendario en la zona del
 * club: un ingreso a las 23 h de ayer es "Ayer" aunque hayan pasado menos de 24 h.
 */
export function formatUltimoIngreso(date: Date | null, now: Date = new Date()): string {
  if (!date) return '—';
  const hoy = hoyEnArgentina(now);
  const dia = hoyEnArgentina(date);
  if (dia === hoy) return 'Hoy';
  if (dia === sumarDiasClave(hoy, -1)) return 'Ayer';
  const [anio, mes, d] = dia.split('-').map(Number);
  const corto = `${d}/${mes}`;
  return anio === Number(hoy.slice(0, 4)) ? corto : `${corto}/${anio}`;
}

function iniciales(usuario: Usuario): string {
  const ini = `${usuario.firstName.trim().charAt(0)}${usuario.lastName.trim().charAt(0)}`;
  return (ini || usuario.email.charAt(0)).toUpperCase();
}

function nombreCompleto(usuario: Usuario): string {
  return `${usuario.firstName} ${usuario.lastName}`.trim() || usuario.email;
}

const ROL_PUNTO: Record<string, string> = {
  admin:         'bg-primario',
  entrenador:    'bg-acento',
  medico:        'bg-secundario',
  kinesiologo:   'bg-teal-700',
  nutricionista: 'bg-violet-600',
  psicologo:     'bg-amber-700',
  cardiologo:    'bg-red-600',
  responsable_viandas: 'bg-cyan-700',
};

function rolLabel(rol: string): string {
  return (ROL_LABELS as Record<string, string>)[rol] ?? (rol || '—');
}

function PuntoRol({ rol }: { rol: string }) {
  return (
    <span
      aria-hidden
      data-punto-rol={rol}
      className={`size-2 shrink-0 rounded-full ${ROL_PUNTO[rol] ?? 'bg-gray-300'}`}
    />
  );
}

/**
 * El rol en una sola píldora: para el admin es el dropdown que lo cambia; para el resto
 * (o en una invitación, que todavía no tiene membresía) es solo la etiqueta.
 */
function RolPildora({ usuario, editable }: { usuario: Usuario; editable: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const label = rolLabel(usuario.rol);

  if (!editable) {
    return (
      <span className={`${PILDORA} border-border bg-white text-foreground`}>
        <PuntoRol rol={usuario.rol} />
        <span className="truncate">{label}</span>
      </span>
    );
  }

  function handleChange(nuevoRol: string) {
    if (nuevoRol === usuario.rol) return;
    startTransition(async () => {
      const result = await cambiarRol(usuario.id, nuevoRol);
      if (result.ok) {
        toast.success('Rol actualizado');
        router.refresh();
      } else {
        toast.error(result.error ?? 'Error al actualizar el rol');
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isPending}
        aria-label={`Rol de ${nombreCompleto(usuario)}: ${label}`}
        className={`${PILDORA} border-border bg-white text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secundario/40 disabled:opacity-50 data-[state=open]:border-primario`}
      >
        <PuntoRol rol={usuario.rol} />
        <span className="truncate">{label}</span>
        {isPending ? (
          <Loader2 aria-hidden className="size-3 shrink-0 animate-spin" />
        ) : (
          <ChevronDown aria-hidden className="size-3 shrink-0 text-muted-foreground" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {ROLES_PERMITIDOS.map((rol) => (
          <DropdownMenuItem key={rol} onSelect={() => handleChange(rol)}>
            <Check
              aria-hidden
              className={`size-3.5 shrink-0 text-primario ${rol === usuario.rol ? 'opacity-100' : 'opacity-0'}`}
            />
            {ROL_LABELS[rol]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Un responsable de viandas sin lugar asignado no puede registrar nada, así que el
 * estado se hace VISIBLE en vez de imposible: el admin lo ve acá en ámbar y el
 * propio usuario se topa con un banner bloqueante en /viandas. Prevenirlo con un
 * wizard no cubriría a quien fue invitado antes de que el campo existiera.
 */
function LugarRetiroPildora({ usuario, editable }: { usuario: Usuario; editable: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const lugar = usuario.lugarRetiro;
  const label = lugar
    ? ((LUGAR_RETIRO_LABELS as Record<string, string>)[lugar] ?? lugar)
    : 'Sin lugar asignado';
  const clases = lugar
    ? 'border-border bg-muted text-foreground'
    : 'border-amber-200 bg-amber-100 text-amber-800';
  const contenido = (
    <>
      {!lugar && <TriangleAlert aria-hidden className="size-3 shrink-0" />}
      <span className="truncate">{label}</span>
    </>
  );

  if (!editable) {
    return <span className={`${PILDORA} ${clases}`}>{contenido}</span>;
  }

  function handleChange(nuevo: string) {
    if (nuevo === lugar) return;
    startTransition(async () => {
      const result = await asignarLugarRetiro(usuario.id, nuevo);
      if (result.ok) {
        toast.success('Lugar de retiro actualizado');
        router.refresh();
      } else {
        toast.error(result.error ?? 'Error al actualizar el lugar');
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isPending}
        aria-label={`Lugar de retiro de ${nombreCompleto(usuario)}: ${label}`}
        className={`${PILDORA} ${clases} transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secundario/40 disabled:opacity-50`}
      >
        {contenido}
        {isPending ? (
          <Loader2 aria-hidden className="size-3 shrink-0 animate-spin" />
        ) : (
          <ChevronDown aria-hidden className="size-3 shrink-0 opacity-70" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        {LUGARES_RETIRO.map((l) => (
          <DropdownMenuItem key={l} onSelect={() => handleChange(l)}>
            <Check
              aria-hidden
              className={`size-3.5 shrink-0 text-primario ${l === lugar ? 'opacity-100' : 'opacity-0'}`}
            />
            {LUGAR_RETIRO_LABELS[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PildorasRol({ usuario, isAdmin }: { usuario: Usuario; isAdmin: boolean }) {
  const editable = isAdmin && !esInvitacion(usuario);
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      <RolPildora usuario={usuario} editable={editable} />
      {usuario.rol === 'responsable_viandas' && (
        <LugarRetiroPildora usuario={usuario} editable={editable} />
      )}
    </div>
  );
}

function UsuarioNombre({ usuario }: { usuario: Usuario }) {
  const nombre = nombreCompleto(usuario);
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar
        src={esInvitacion(usuario) ? null : (usuario.imageUrl ?? null)}
        alt={nombre}
        iniciales={iniciales(usuario)}
        className="size-9 text-xs"
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{nombre}</p>
        <p className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
          <Mail aria-hidden className="size-3 shrink-0" />
          <span className="truncate">{usuario.email}</span>
        </p>
      </div>
    </div>
  );
}

function ultimoIngreso(usuario: Usuario): string {
  return esInvitacion(usuario) ? '—' : formatUltimoIngreso(usuario.lastSignInAt);
}

interface UsuarioAccionesProps {
  usuario: Usuario;
  isAdmin: boolean;
  currentUserId: string;
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

  const showReenviar = esInvitacion(usuario);
  const showDeshabilitar = usuario.status === 'activo' && usuario.id !== currentUserId;
  const showReactivar = usuario.status === 'inactivo';

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
    'flex items-center gap-2 w-full px-4 py-2 text-sm text-left text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
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
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg bg-white text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secundario/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${open ? 'border-primario' : 'border-gray-200'}`}
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

const BADGE = 'inline-flex shrink-0 items-center text-xs font-medium px-2.5 py-1 rounded-full';

function EstadoBadge({ usuario }: { usuario: Usuario }) {
  if (usuario.status === 'inactivo') {
    return (
      <span
        className={`${BADGE} bg-gray-100 text-muted-foreground`}
        title="No puede entrar a este club hasta que lo reactiven"
      >
        Deshabilitado
      </span>
    );
  }
  if (usuario.status === 'activo') {
    return <span className={`${BADGE} bg-green-100 text-green-700`}>Activo</span>;
  }
  if (usuario.status === 'vencida') {
    return (
      <span
        className={`${BADGE} bg-gray-100 text-muted-foreground`}
        title="La invitación venció: reenviala para que pueda entrar"
      >
        Vencida
      </span>
    );
  }
  return <span className={`${BADGE} bg-amber-100 text-amber-800`}>Pendiente</span>;
}

interface UsuariosTableProps {
  usuarios: Usuario[];
  /** Rol del usuario logueado en el club activo (sale de su `Membresia`). */
  rol: string;
  currentUserId: string;
}

type ConfirmModalState = {
  open: boolean;
  action: 'deshabilitar' | 'reactivar' | 'eliminar' | null;
  usuario: Usuario | null;
};

export default function UsuariosTable({ usuarios, rol, currentUserId }: UsuariosTableProps) {
  const isAdmin = rol === 'admin';

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
        } else if (!esInvitacion(usuario)) {
          toast.success('Usuario eliminado del club');
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
        description: `¿Seguro que querés deshabilitar a ${nombre}? No podrá entrar a este club hasta que sea reactivado.`,
        confirmLabel: 'Deshabilitar',
        danger: true,
      };
    }
    if (action === 'reactivar') {
      return {
        title: 'Reactivar usuario',
        description: `¿Seguro que querés reactivar a ${nombre}? Recuperará el acceso a este club.`,
        confirmLabel: 'Reactivar',
        danger: false,
      };
    }
    if (usuario && esInvitacion(usuario)) {
      return {
        title: 'Eliminar invitación',
        description: `¿Seguro que querés eliminar la invitación de ${nombre}? Esta acción no se puede deshacer.`,
        confirmLabel: 'Eliminar',
        danger: true,
      };
    }
    return {
      title: 'Eliminar usuario',
      description: `¿Seguro que querés quitar a ${nombre} del club? Su cuenta sigue existiendo, pero tendrá que ser invitado de nuevo para volver.`,
      confirmLabel: 'Eliminar',
      danger: true,
    };
  }

  const modalProps = getModalProps(confirmModal);

  return (
    <>
      <Panel relleno={false} className="overflow-hidden">
        <ul className="lg:hidden divide-y divide-border">
          {usuarios.length === 0 ? (
            <li className="px-4 py-12 text-center text-sm text-muted-foreground">
              No hay usuarios registrados
            </li>
          ) : (
            usuarios.map((usuario) => {
              const isDisabled = usuario.status === 'inactivo';
              return (
                <li
                  key={usuario.id}
                  className={`px-4 py-4 flex flex-col gap-2.5${isDisabled ? ' opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <UsuarioNombre usuario={usuario} />
                    <UsuarioAcciones
                      usuario={usuario}
                      isAdmin={isAdmin}
                      currentUserId={currentUserId}
                      openConfirm={openConfirm}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pl-12">
                    <PildorasRol usuario={usuario} isAdmin={isAdmin} />
                    <EstadoBadge usuario={usuario} />
                  </div>
                  <p className="pl-12 text-xs text-muted-foreground">
                    Último ingreso: {ultimoIngreso(usuario)}
                  </p>
                </li>
              );
            })
          )}
        </ul>

        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs uppercase text-muted-foreground bg-muted border-b border-border">
                <th className="px-4 py-3 text-left font-medium">Nombre</th>
                <th className="px-4 py-3 text-left font-medium">Rol</th>
                <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Último ingreso</th>
                <th className="px-4 py-3 text-left font-medium">Estado</th>
                {isAdmin && <th className="px-4 py-3 text-left font-medium">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {usuarios.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 5 : 4}
                    className="px-5 py-12 text-center text-sm text-muted-foreground"
                  >
                    No hay usuarios registrados
                  </td>
                </tr>
              ) : (
                usuarios.map((usuario) => {
                  const isDisabled = usuario.status === 'inactivo';
                  return (
                    <tr
                      key={usuario.id}
                      className={`border-b border-border last:border-0 hover:bg-muted/60 transition-colors${isDisabled ? ' opacity-60' : ''}`}
                    >
                      <td className="max-w-0 w-[40%] px-4 py-3">
                        <UsuarioNombre usuario={usuario} />
                      </td>
                      <td className="px-4 py-3">
                        <PildorasRol usuario={usuario} isAdmin={isAdmin} />
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                        {ultimoIngreso(usuario)}
                      </td>
                      <td className="px-4 py-3">
                        <EstadoBadge usuario={usuario} />
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <UsuarioAcciones
                            usuario={usuario}
                            isAdmin={isAdmin}
                            currentUserId={currentUserId}
                            openConfirm={openConfirm}
                          />
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Panel>

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
