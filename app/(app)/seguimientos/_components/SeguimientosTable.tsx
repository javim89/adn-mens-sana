'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Plus, Pencil, Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import type {
  SeguimientoListItem,
  TipoSeguimiento,
  PrioridadSeguimiento,
} from '@/lib/types/seguimientos';
import DeleteSeguimientoModal from './DeleteSeguimientoModal';
import { CustomSelect } from '@/app/components/ui/custom-select';
import {
  getTipoSeguimientoMeta,
  PRIORIDAD_LABELS,
  PRIORIDAD_STYLES,
} from '@/lib/utils/seguimiento-tipo';

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
  currentPrioridad: string;
  currentArea: string;
  currentDisciplina: string;
  currentCategoria: string;
  currentSearch: string;
}

function TipoBadge({ tipo }: { tipo: TipoSeguimiento | null }) {
  const meta = getTipoSeguimientoMeta(tipo);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${meta.badge}`}
    >
      {meta.label}
    </span>
  );
}

function PrioridadBadge({ prioridad }: { prioridad: PrioridadSeguimiento }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORIDAD_STYLES[prioridad] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {PRIORIDAD_LABELS[prioridad] ?? prioridad}
    </span>
  );
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr + 'T00:00:00'));
}

function formatDatetime(isoStr: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoStr));
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
  currentPrioridad,
  currentArea,
  currentDisciplina,
  currentCategoria,
  currentSearch,
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

  function handlePrioridadChange(value: string) {
    navigate(buildUrl({ prioridad: value || null, page: null }));
  }

  function handleAreaChange(value: string) {
    navigate(buildUrl({ area: value || null, page: null }));
  }

  function handleDisciplinaChange(value: string) {
    navigate(buildUrl({ disciplina: value || null, categoria: null, page: null }));
  }

  function handleCategoriaChange(value: string) {
    navigate(buildUrl({ categoria: value || null, page: null }));
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

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1
          className="text-3xl font-bold text-[#121A61]"
          style={{ fontFamily: 'Oswald, sans-serif' }}
        >
          Seguimientos
        </h1>
        {canWrite && (
          <Link
            href="/seguimientos/nuevo"
            className="flex items-center gap-2 bg-[#121A61] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#1E2A8A] transition-colors shrink-0"
          >
            <Plus size={16} />
            Nuevo seguimiento
          </Link>
        )}
      </div>
      <p className="text-[#6B7280] mb-6">
        Evaluaciones y seguimiento clínico de deportistas
        {total > 0 && (
          <span className="ml-2 text-xs font-medium bg-gray-100 text-[#6B7280] px-2 py-0.5 rounded-full">
            {total} {total === 1 ? 'seguimiento' : 'seguimientos'}
          </span>
        )}
      </p>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por título o deportista..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30 bg-white"
          />
        </div>

        <CustomSelect
          value={currentPrioridad}
          onChange={handlePrioridadChange}
          options={[
            { value: '', label: 'Todas las prioridades' },
            { value: 'BAJA', label: 'Baja' },
            { value: 'MEDIA', label: 'Media' },
            { value: 'ALTA', label: 'Alta' },
            { value: 'URGENTE', label: 'Urgente' },
          ]}
          className="min-w-[160px]"
        />

        <CustomSelect
          value={currentDisciplina}
          onChange={handleDisciplinaChange}
          searchable
          options={[
            { value: '', label: 'Todas las disciplinas' },
            ...disciplinas.map((d) => ({ value: d.id, label: d.nombre })),
          ]}
          className="min-w-[160px]"
        />

        <CustomSelect
          value={currentCategoria}
          onChange={handleCategoriaChange}
          searchable
          disabled={!currentDisciplina}
          options={[
            { value: '', label: 'Todas las categorías' },
            ...categoriasFiltro.map((c) => ({ value: c.id, label: c.nombre })),
          ]}
          className="min-w-[160px]"
        />

        {isAdmin && profesionales.length > 0 && (
          <CustomSelect
            value={currentArea}
            onChange={handleAreaChange}
            searchable
            options={[
              { value: '', label: 'Todas las áreas' },
              ...profesionales.map((p) => ({ value: p.id, label: p.nombre })),
            ]}
            className="min-w-[160px]"
          />
        )}
      </div>

      <div
        className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-opacity ${isPending ? 'opacity-60' : ''}`}
      >
        {/* Mobile card list */}
        <ul className="lg:hidden divide-y divide-gray-100">
          {seguimientos.length === 0 ? (
            <li className="px-4 py-12 text-center text-sm text-[#6B7280]">
              No hay seguimientos.{' '}
              {canWrite && (
                <Link href="/seguimientos/nuevo" className="text-[#121A61] underline hover:no-underline">
                  Crear el primero
                </Link>
              )}
            </li>
          ) : (
            seguimientos.map((s) => {
              const canModifyRow = isAdmin || s.profesionalId === currentUserId;
              return (
                <li key={s.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <Link
                          href={`/seguimientos/${s.id}`}
                          className="text-sm font-semibold text-[#1C1C1C] hover:text-[#121A61] truncate transition-colors"
                        >
                          {s.titulo}
                        </Link>
                        <PrioridadBadge prioridad={s.prioridad} />
                        <TipoBadge tipo={s.tipoSeguimiento} />
                      </div>
                      <p className="text-xs text-[#6B7280] mt-0.5">
                        {s.deportistaNombre} · {formatDate(s.fecha)}
                      </p>
                      {isAdmin && (
                        <p className="text-xs text-[#6B7280] mt-0.5">
                          Profesional: {s.profesionalNombre}
                        </p>
                      )}
                      {s.proximaCita && (
                        <p className="text-xs text-[#6B7280] mt-0.5">
                          Próxima cita: {formatDatetime(s.proximaCita)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Link
                        href={`/seguimientos/${s.id}`}
                        className="text-[#6B7280] hover:text-[#121A61] transition-colors p-1"
                        title="Ver seguimiento"
                      >
                        <Eye size={15} />
                      </Link>
                      {canModifyRow && (
                        <>
                          <Link
                            href={`/seguimientos/${s.id}/editar`}
                            className="text-[#6B7280] hover:text-[#121A61] transition-colors p-1"
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
                  </div>
                </li>
              );
            })
          )}
        </ul>

        {/* Desktop table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs uppercase text-[#6B7280] bg-[#F3F4F6] border-b border-gray-100">
                <th className="px-5 py-3 text-left">Deportista</th>
                <th className="px-5 py-3 text-left">Fecha</th>
                <th className="px-5 py-3 text-left">Título</th>
                <th className="px-5 py-3 text-left">Prioridad</th>
                <th className="hidden xl:table-cell px-5 py-3 text-left">Tipo</th>
                {isAdmin && <th className="px-5 py-3 text-left">Área responsable</th>}
                <th className="px-5 py-3 text-left">Próxima cita</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {seguimientos.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 8 : 7}
                    className="px-5 py-12 text-center text-sm text-[#6B7280]"
                  >
                    No hay seguimientos.{' '}
                    {canWrite && (
                      <Link
                        href="/seguimientos/nuevo"
                        className="text-[#121A61] underline hover:no-underline"
                      >
                        Crear el primero
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                seguimientos.map((s) => {
                  const canModifyRow = isAdmin || s.profesionalId === currentUserId;
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-gray-50 hover:bg-[#F3F4F6] transition-colors"
                    >
                      <td className="px-5 py-3.5 text-sm text-[#6B7280] max-w-[150px]">
                        <span className="block truncate" title={s.deportistaNombre}>
                          {s.deportistaNombre}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[#6B7280] whitespace-nowrap">
                        {formatDate(s.fecha)}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-medium text-[#1C1C1C] max-w-[200px]">
                        <Link
                          href={`/seguimientos/${s.id}`}
                          className="block truncate hover:text-[#121A61] transition-colors"
                          title={s.titulo}
                        >
                          {s.titulo}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <PrioridadBadge prioridad={s.prioridad} />
                      </td>
                      <td className="hidden xl:table-cell px-5 py-3.5">
                        <TipoBadge tipo={s.tipoSeguimiento} />
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-3.5 text-sm text-[#6B7280] max-w-[160px]">
                          <span className="block truncate" title={s.profesionalNombre}>
                            {s.profesionalNombre}
                          </span>
                        </td>
                      )}
                      <td className="px-5 py-3.5 text-sm text-[#6B7280] whitespace-nowrap">
                        {s.proximaCita ? formatDatetime(s.proximaCita) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1 justify-end">
                          <Link
                            href={`/seguimientos/${s.id}`}
                            className="text-[#6B7280] hover:text-[#121A61] transition-colors p-1"
                            title="Ver seguimiento"
                          >
                            <Eye size={15} />
                          </Link>
                          {canModifyRow && (
                            <>
                              <Link
                                href={`/seguimientos/${s.id}/editar`}
                                className="text-[#6B7280] hover:text-[#121A61] transition-colors p-1"
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
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination controls */}
      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
          <p className="text-xs text-[#6B7280]">
            Mostrando {from}–{to} de {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 0 || isPending}
              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-[#1C1C1C] hover:bg-[#F3F4F6] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Página anterior"
            >
              <ChevronLeft size={14} />
              Anterior
            </button>
            <span className="text-xs text-[#6B7280] whitespace-nowrap">
              Página {currentPage + 1} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages - 1 || isPending}
              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-[#1C1C1C] hover:bg-[#F3F4F6] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Página siguiente"
            >
              Siguiente
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
