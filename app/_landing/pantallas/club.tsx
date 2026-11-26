import { ChevronDown, ImageUp, Mail, Sparkles } from 'lucide-react';
import { ROL_LABELS } from '@/lib/roles';
import { Avatar } from '@/app/components/ui/avatar';
import VistaPreviaTema from '../../(app)/configuracion/_components/VistaPreviaTema';
import { CLUB_EJEMPLO_DEMO, USUARIOS_DEMO, type UsuarioDemo } from '../datos-demo';
import { BADGE, BotonDemo, EncabezadoPantalla, PanelDemo, Pantalla, RotuloDemo } from './comun';

/**
 * El tema del club de ejemplo, como lo inyecta `TemaClub`: pisa las `--club-*` solo dentro
 * de la vista previa. Clases literales para que Tailwind las genere; los hex coinciden
 * con `CLUB_EJEMPLO_DEMO.colores`.
 */
const TEMA_EJEMPLO =
  '[--club-primario:#14532D] [--club-primario-foreground:#FFFFFF] [--club-primario-suave:#DCFCE7] [--club-secundario:#15803D] [--club-secundario-foreground:#FFFFFF] [--club-acento:#EAB308] [--club-acento-foreground:#1C1C1C]';

/** Muestras de color: las mismas tres, en clases literales. */
const MUESTRA: Record<string, string> = {
  Primario: 'bg-[#14532D]',
  Secundario: 'bg-[#15803D]',
  Acento: 'bg-[#EAB308]',
};

/** `/configuracion`: nombre, logo y colores sugeridos, con la vista previa real (`VistaPreviaTema`) en los colores del club. */
export function PantallaBrandingConfiguracion() {
  const c = CLUB_EJEMPLO_DEMO;
  return (
    <Pantalla clave="branding-configuracion" activo="/configuracion">
      <EncabezadoPantalla titulo="Configuración del club" bajada="Nombre, logo y colores de tu club en la app." />

      <div className="mt-4 grid items-start gap-4 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <PanelDemo className="grid gap-4 p-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#1C1C1C]">Nombre</p>
            <div className="mt-1 flex h-9 items-center rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#1C1C1C]">
              <span className="truncate">{c.nombre}</span>
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-xs font-medium text-[#1C1C1C]">Logo</p>
            <div className="mt-1 flex items-center gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white font-[family-name:var(--font-oswald)] text-base font-bold text-[#14532D]">
                {c.iniciales}
              </span>
              <BotonDemo variante="secundario">
                <ImageUp className="size-3.5" aria-hidden />
                Cambiar logo
              </BotonDemo>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-[#3346CC]/[0.06] p-2.5 text-xs text-[#1C1C1C]">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-[#3346CC]" aria-hidden />
            Colores sugeridos a partir del logo. Podés ajustarlos.
          </div>

          <div className="grid grid-cols-3 gap-2">
            {c.colores.map((col) => (
              <div key={col.label} className="min-w-0">
                <p className="truncate text-xs font-medium text-[#1C1C1C]">{col.label}</p>
                <div className="mt-1 flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-2">
                  <span className={`size-5 shrink-0 rounded ${MUESTRA[col.label]}`} />
                  <span className="hidden truncate font-mono text-xs text-[#6B7280] @md:inline">{col.hex}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <BotonDemo>Guardar</BotonDemo>
          </div>
        </PanelDemo>

        <div className="min-w-0">
          <RotuloDemo className="mb-2">Vista previa</RotuloDemo>
          <div className={TEMA_EJEMPLO}>
            <VistaPreviaTema nombre={c.nombre} logoSrc={null} />
          </div>
        </div>
      </div>
    </Pantalla>
  );
}

const ESTADO_USUARIO: Record<UsuarioDemo['estado'], string> = {
  Activo: 'bg-green-100 text-green-700',
  Pendiente: 'bg-amber-100 text-amber-800',
  Deshabilitado: 'bg-gray-100 text-[#6B7280]',
};

const COLUMNAS = '@2xl:grid-cols-[minmax(0,1fr)_minmax(0,150px)_88px_100px]';

/** `/usuarios`: quién tiene acceso, con su rol, último ingreso y estado (cards en angosto, tabla desde `@2xl`). */
export function PantallaUsuariosRoles() {
  return (
    <Pantalla clave="usuarios-roles" activo="/usuarios">
      <EncabezadoPantalla titulo="Usuarios" contador={`${USUARIOS_DEMO.length}`} accion="Invitar usuario" />
      <PanelDemo className="mt-4 overflow-hidden">
        <div
          className={`hidden gap-x-3 border-b border-gray-100 bg-[#F3F4F6] px-4 py-2.5 text-xs uppercase text-[#6B7280] @2xl:grid ${COLUMNAS}`}
        >
          <span>Nombre</span>
          <span>Rol</span>
          <span>Último ingreso</span>
          <span>Estado</span>
        </div>
        {USUARIOS_DEMO.map((u, i) => (
          <div
            key={u.id}
            className={`${i >= 5 ? 'hidden @2xl:grid' : 'grid'} grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 border-b border-gray-50 px-3 py-3 last:border-0 @2xl:px-4 @2xl:py-2.5 ${COLUMNAS}`}
          >
            <Avatar alt={u.nombre} iniciales={u.iniciales} className="row-span-2 size-8 text-xs @2xl:hidden" />
            <div className="flex min-w-0 items-center gap-2">
              <Avatar alt={u.nombre} iniciales={u.iniciales} className="hidden size-8 text-xs @2xl:block" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#1C1C1C]">{u.nombre}</p>
                <p className="flex items-center gap-1 truncate text-xs text-[#6B7280]">
                  <Mail className="size-3 shrink-0" aria-hidden />
                  <span className="truncate">{u.email}</span>
                </p>
              </div>
            </div>
            <div className="col-start-2 flex flex-wrap items-center gap-1.5 @2xl:contents">
              <span className="inline-flex w-fit min-w-0 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-[#1C1C1C]">
                <span className="truncate">{ROL_LABELS[u.rol]}</span>
                <ChevronDown className="size-3 shrink-0 text-[#6B7280]" aria-hidden />
              </span>
              <span className="hidden text-sm text-[#6B7280] @2xl:block">{u.ultimoIngreso}</span>
              <span className={`${BADGE} ${ESTADO_USUARIO[u.estado]}`}>{u.estado}</span>
            </div>
          </div>
        ))}
      </PanelDemo>
    </Pantalla>
  );
}
