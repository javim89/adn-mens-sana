'use client';

import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Plus, Pencil, Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import type {
  SeguimientoListItem,
  TipoSeguimiento,
  PrioridadSeguimiento,
} from '@/lib/types/seguimientos';
import { Avatar } from '@/app/components/ui/avatar';
import { Button } from '@/app/components/ui/button';
import { EncabezadoPagina } from '@/app/components/ui/encabezado-pagina';
import { FiltroChip } from '@/app/components/ui/filtro-chip';
import { LayoutConLateral } from '@/app/components/ui/layout-con-lateral';
import { Panel } from '@/app/components/ui/panel';
import {
  getTipoSeguimientoMeta,
  PRIORIDAD_LABELS,
  PRIORIDAD_STYLES,
  TIPO_SEGUIMIENTO_META,
} from '@/lib/utils/seguimiento-tipo';
import DeleteSeguimientoModal from './DeleteSeguimientoModal';
import { fechaCorta, fechaLarga, inicialesDe } from '../_lib/formato';

interface ProfesionalOption {
  id: string;
  nombre: string;
}

interface Props {
  initialSeguimientos: SeguimientoListItem[];
  total: number;
  page: number; // 0-based
  pageSize: number;
  isAdmin: boolean;
  canWrite: boolean;
  currentUserId: string;
  profesionales: ProfesionalOption[];
  disciplinas: { id: string; nombre: string; categorias: { id: string; nombre: string }[] }[];
  currentPrioridades: PrioridadSeguimiento[];
  currentTipo: TipoSeguimiento | null;
  currentArea: string;
  currentDisciplina: string;
  currentCategoria: string;
  currentSearch: string;
  /** Columna derecha (paneles server-side: por tipo, próximos turnos). */
  lateral?: ReactNode;
}

const BADGE =
  'inline-flex w-fit shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap';

const PRIORIDAD_OPCIONES = (['BAJA', 'MEDIA', 'ALTA', 'URGENTE'] as const).map((p) => ({
  value: p,
  label: PRIORIDAD_LABELS[p],
}));

const TIPO_OPCIONES = (Object.keys(TIPO_SEGUIMIENTO_META) as TipoSeguimiento[]).map((t) => ({
  value: t,
  label: TIPO_SEGUIMIENTO_META[t].label,
}));

function TipoBadge({ tipo }: { tipo: TipoSeguimiento | null }) {
  const meta = getTipoSeguimientoMeta(tipo);
  return <span className={`${BADGE} ${meta.badge}`}>{meta.label}</span>;
}

function PrioridadBadge({ prioridad }: { prioridad: PrioridadSeguimiento }) {
  return (
    <span className={`${BADGE} ${PRIORIDAD_STYLES[prioridad] ?? 'bg-gray-100 text-gray-600'}`}>
      {PRIORIDAD_LABELS[prioridad] ?? prioridad}
    </span>
  );
}

/** Avatar del primer deportista + su nombre y, si hay más, "+N" (que nunca se trunca). */
function DeportistaCelda({ deportistas }: { deportistas: SeguimientoListItem['deportistas'] }) {
  const primero = deportistas[0];
  const nombres = deportistas.map((d) => `${d.apellido}, ${d.nombre}`);
  const resto = deportistas.length - 1;
  return (
    <div className="flex min-w-0 items-center gap-2.5" title={nombres.join(' · ') || undefined}>
      {primero ? (
        <Avatar alt={nombres[0]} iniciales={inicialesDe(primero)} className="size-8 text-xs" />
      ) : (
        <span className="size-8 shrink-0 rounded-full bg-muted" aria-hidden />
      )}
      <span className="truncate text-sm font-medium text-foreground">{nombres[0] ?? '—'}</span>
      {resto > 0 && <span className="shrink-0 text-xs text-muted-foreground">+{resto}</span>}
    </div>
  );
}

export default function SeguimientosTable({
  initialSeguimientos,
  total,
  page,
  pageSize,
  isAdmin,
  canWrite,
  currentUserId,
  profesionales,
  disciplinas,
  currentPrioridades,
  currentTipo,
  currentArea,
  currentDisciplina,
  currentCategoria,
  currentSearch,
  lateral,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Input de búsqueda controlado localmente (con debounce hacia la URL).
  // Se sincroniza con la URL sin useEffect: si `currentSearch` (fuente de verdad)
  // cambia por navegación externa, reseteamos el estado local durante el render.
  const [searchInput, setSearchInput] = useState(currentSearch);
  const [lastSyncedSearch, setLastSyncedSearch] = useState(currentSearch);
  if (currentSearch !== lastSyncedSearch) {
    setLastSyncedSearch(currentSearch);
    setSearchInput(currentSearch);
  }
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const seguimientos = initialSeguimientos;

  const categoriasFiltro =
    disciplinas.find((d) => d.id === currentDisciplina)?.categorias ?? [];

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages - 1);

  const hayFiltros =
    currentPrioridades.length > 0 ||
    Boolean(currentTipo || currentArea || currentDisciplina || currentCategoria || currentSearch);

  /** Construye una nueva URL a partir de los searchParams actuales con overrides. */
  function buildUrl(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function navigate(url: string, replace = false) {
    startTransition(() => {
      if (replace) router.replace(url);
      else router.push(url);
    });
  }

  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      navigate(buildUrl({ q: value.trim() || null, page: null }), true);
    }, 350);
  }

  function goToPage(target: number) {
    const clamped = Math.max(0, Math.min(target, totalPages - 1));
    navigate(buildUrl({ page: clamped === 0 ? null : String(clamped) }));
  }

  function handleDeleted() {
    // El estado local ya no es la fuente de verdad: re-traemos la página actual.
    startTransition(() => router.refresh());
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const from = total === 0 ? 0 : currentPage * pageSize + 1;
  const to = Math.min(total, currentPage * pageSize + seguimientos.length);
  const sustantivo = total === 1 ? 'seguimiento' : 'seguimientos';

  function renderAcciones(s: SeguimientoListItem) {
    const canModifyRow = isAdmin || s.profesionalId === currentUserId;
    return (
      <div className="flex shrink-0 items-center justify-end gap-1">
        <Link
          href={`/seguimientos/${s.id}`}
          className="p-1 text-muted-foreground transition-colors hover:text-primario"
          title="Ver seguimiento"
        >
          <Eye size={15} />
        </Link>
        {canModifyRow && (
          <>
            <Link
              href={`/seguimientos/${s.id}/editar`}
              className="p-1 text-muted-foreground transition-colors hover:text-primario"
              title="Editar seguimiento"
            >
              <Pencil size={15} />
            </Link>
            <DeleteSeguimientoModal
              seguimientoId={s.id}
              seguimientoTitulo={s.titulo}
              onDeleted={handleDeleted}
            />
          </>
        )}
      </div>
    );
  }

  const vacio = (
    <>
      No hay seguimientos.{' '}
      {canWrite && (
        <Link href="/seguimientos/nuevo" className="text-primario underline hover:no-underline">
          Crear el primero
        </Link>
      )}
    </>
  );

  const tabla = (
    <div className="flex min-w-0 flex-col gap-4">
      {/* Total honesto: es lo que matchea los filtros, no "abiertos" (no hay estado de cierre). */}
      <div className="flex items-center gap-4 rounded-2xl bg-primario px-5 py-4 text-white md:gap-5 md:px-6 md:py-5">
        <p
          className="font-[family-name:var(--font-oswald)] text-4xl font-semibold leading-none tabular-nums md:text-5xl"
          aria-hidden
        >
          {total}
        </p>
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium text-white/85">
            <span className="sr-only">{total} </span>
            {total === 1 ? 'Seguimiento' : 'Seguimientos'}
            {hayFiltros ? ' con los filtros aplicados' : ' registrados'}
          </p>
          <p className="text-xs text-white/70">
            Médicos, psicológicos, nutricionales y sociales, de todo el plantel.
          </p>
        </div>
      </div>

      <Panel
        relleno={false}
        className={`overflow-hidden transition-opacity ${isPending ? 'opacity-60' : ''}`}
      >
        {/* Mobile card list */}
        <ul className="divide-y divide-gray-100 lg:hidden">
          {seguimientos.length === 0 ? (
            <li className="px-4 py-12 text-center text-sm text-muted-foreground">{vacio}</li>
          ) : (
            seguimientos.map((s) => (
              <li key={s.id} className="px-4 py-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <DeportistaCelda deportistas={s.deportistas} />
                      <span
                        className="shrink-0 text-xs text-muted-foreground"
                        title={fechaLarga(s.fecha)}
                      >
                        {fechaCorta(s.fecha)}
                      </span>
                    </div>
                    <div className="mt-1.5 pl-[2.625rem]">
                      <Link
                        href={`/seguimientos/${s.id}`}
                        className="block truncate text-sm text-foreground transition-colors hover:text-primario"
                      >
                        {s.titulo}
                      </Link>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <PrioridadBadge prioridad={s.prioridad} />
                        <TipoBadge tipo={s.tipoSeguimiento} />
                      </div>
                      {isAdmin && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          Profesional: {s.profesionalNombre}
                        </p>
                      )}
                    </div>
                  </div>
                  {renderAcciones(s)}
                </div>
              </li>
            ))
          )}
        </ul>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-muted text-xs uppercase text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">Deportista</th>
                <th className="px-4 py-3 text-left font-medium">Título</th>
                <th className="px-4 py-3 text-left font-medium">Fecha</th>
                <th className="px-4 py-3 text-left font-medium">Prioridad</th>
                {isAdmin && (
                  <th className="hidden px-4 py-3 text-left font-medium xl:table-cell">
                    Profesional
                  </th>
                )}
                <th className="px-4 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {seguimientos.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 6 : 5}
                    className="px-4 py-12 text-center text-sm text-muted-foreground"
                  >
                    {vacio}
                  </td>
                </tr>
              ) : (
                seguimientos.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50 transition-colors hover:bg-muted">
                    <td className="max-w-[220px] px-4 py-3">
                      <DeportistaCelda deportistas={s.deportistas} />
                    </td>
                    <td className="max-w-[280px] px-4 py-3">
                      <Link
                        href={`/seguimientos/${s.id}`}
                        className="block truncate text-sm text-foreground transition-colors hover:text-primario"
                        title={s.titulo}
                      >
                        {s.titulo}
                      </Link>
                      <div className="mt-1">
                        <TipoBadge tipo={s.tipoSeguimiento} />
                      </div>
                    </td>
                    <td
                      className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-muted-foreground"
                      title={fechaLarga(s.fecha)}
                    >
                      {fechaCorta(s.fecha)}
                    </td>
                    <td className="px-4 py-3">
                      <PrioridadBadge prioridad={s.prioridad} />
                    </td>
                    {isAdmin && (
                      <td className="hidden max-w-[160px] px-4 py-3 text-sm text-muted-foreground xl:table-cell">
                        <span className="block truncate" title={s.profesionalNombre}>
                          {s.profesionalNombre}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      {renderAcciones(s)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Mostrando {from}–{to} de {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 0 || isPending}
              aria-label="Página anterior"
            >
              <ChevronLeft size={14} />
              Anterior
            </Button>
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              Página {currentPage + 1} de {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages - 1 || isPending}
              aria-label="Página siguiente"
            >
              Siguiente
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Seguimientos"
        contador={total}
        contadorLabel={`${total} ${sustantivo}`}
        subtitulo="Evaluaciones y seguimiento clínico de deportistas."
        accion={
          canWrite && (
            <Link
              href="/seguimientos/nuevo"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primario px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primario-hover"
            >
              <Plus size={16} />
              Nuevo seguimiento
            </Link>
          )
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar por título o deportista..."
              aria-label="Buscar seguimientos"
              className="h-9 w-full rounded-full border border-border bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-secundario/30"
            />
          </div>

          <FiltroChip
            label="Prioridad"
            modo="multiple"
            todosLabel="Todas"
            opciones={PRIORIDAD_OPCIONES}
            valor={currentPrioridades}
            onChange={(v) => navigate(buildUrl({ prioridad: v.join(',') || null, page: null }))}
          />

          <FiltroChip
            label="Tipo"
            opciones={TIPO_OPCIONES}
            valor={currentTipo}
            onChange={(v) => navigate(buildUrl({ tipo: v, page: null }))}
          />

          {isAdmin && profesionales.length > 0 && (
            <FiltroChip
              label="Profesional"
              buscar
              opciones={profesionales.map((p) => ({ value: p.id, label: p.nombre }))}
              valor={currentArea || null}
              onChange={(v) => navigate(buildUrl({ area: v, page: null }))}
            />
          )}

          <FiltroChip
            label="Disciplina"
            buscar
            todosLabel="Todas"
            opciones={disciplinas.map((d) => ({ value: d.id, label: d.nombre }))}
            valor={currentDisciplina || null}
            onChange={(v) => navigate(buildUrl({ disciplina: v, categoria: null, page: null }))}
          />

          <FiltroChip
            label="Categoría"
            buscar
            todosLabel="Todas"
            disabled={!currentDisciplina}
            opciones={categoriasFiltro.map((c) => ({ value: c.id, label: c.nombre }))}
            valor={currentCategoria || null}
            onChange={(v) => navigate(buildUrl({ categoria: v, page: null }))}
          />
        </div>
      </EncabezadoPagina>

      {lateral ? (
        <LayoutConLateral lateral={lateral} lateralLabel="Resumen de seguimientos">
          {tabla}
        </LayoutConLateral>
      ) : (
        tabla
      )}
    </div>
  );
}
