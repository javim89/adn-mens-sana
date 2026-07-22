'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, Plus, ChevronRight, X } from 'lucide-react';
import { useCallback, useState, useTransition } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CustomSelect } from '@/app/components/ui/custom-select';
import { fetchDeportistas, fetchCategorias } from '@/lib/api/deportistas';
import type { FetchDeportistasParams } from '@/lib/api/deportistas';
import {
  DISCIPLINA_LABELS,
  ESTADO_LABELS,
} from '@/lib/utils/enum-labels';
import {
  Disciplina,
  EstadoDeportista,
} from '@/lib/generated/prisma/enums';
import type { Disciplina as DisciplinaType, EstadoDeportista as EstadoType } from '@/lib/generated/prisma/enums';


function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr));
}

const ESTADO_BADGE: Record<string, string> = {
  ACTIVO: 'bg-green-100 text-green-700',
  INACTIVO: 'bg-gray-100 text-[#6B7280]',
  LESIONADO: 'bg-amber-100 text-amber-700',
  SUSPENDIDO: 'bg-red-100 text-red-700',
};

export default function DeportistasTable({ canCreate = true }: { canCreate?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const pageNumber = Number(searchParams.get('page[number]') ?? '1');
  const pageSize = Number(searchParams.get('page[size]') ?? '20');
  const filterSearch = searchParams.get('filter[search]') ?? '';
  const filterDisciplina = searchParams.get('filter[disciplina]') ?? '';
  const filterCategoria = searchParams.get('filter[categoriaId]') ?? '';
  const filterEstado = searchParams.get('filter[estado]') ?? '';

  const [localSearch, setLocalSearch] = useState(filterSearch);

  const queryParams: FetchDeportistasParams = {
    'page[number]': pageNumber,
    'page[size]': pageSize,
    ...(filterSearch ? { 'filter[search]': filterSearch } : {}),
    ...(filterDisciplina ? { 'filter[disciplina]': filterDisciplina } : {}),
    ...(filterCategoria ? { 'filter[categoriaId]': filterCategoria } : {}),
    ...(filterEstado ? { 'filter[estado]': filterEstado } : {}),
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['deportistas', queryParams],
    queryFn: () => fetchDeportistas(queryParams),
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias'],
    queryFn: fetchCategorias,
    staleTime: Infinity,
  });

  const deportistas = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const hasFilters = !!(filterSearch || filterDisciplina || filterCategoria || filterEstado);

  const pushFilters = useCallback(
    (overrides: {
      'filter[search]'?: string;
      'filter[disciplina]'?: string;
      'filter[categoriaId]'?: string;
      'filter[estado]'?: string;
      'page[number]'?: string;
    }) => {
      const params = new URLSearchParams();
      const merged = {
        'filter[search]': filterSearch,
        'filter[disciplina]': filterDisciplina,
        'filter[categoriaId]': filterCategoria,
        'filter[estado]': filterEstado,
        'page[number]': String(pageNumber),
        ...overrides,
      };
      if (merged['filter[search]']) params.set('filter[search]', merged['filter[search]']);
      if (merged['filter[disciplina]']) params.set('filter[disciplina]', merged['filter[disciplina]']);
      if (merged['filter[categoriaId]']) params.set('filter[categoriaId]', merged['filter[categoriaId]']);
      if (merged['filter[estado]']) params.set('filter[estado]', merged['filter[estado]']);
      params.set('page[number]', merged['page[number]'] ?? '1');
      params.set('page[size]', String(pageSize));
      startTransition(() => {
        router.push('/deportistas?' + params.toString());
      });
    },
    [filterSearch, filterDisciplina, filterCategoria, filterEstado, pageNumber, pageSize, router],
  );

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      pushFilters({ 'filter[search]': localSearch, 'page[number]': '1' });
    }
  }

  function handleClear() {
    setLocalSearch('');
    startTransition(() => {
      router.push('/deportistas');
    });
  }

  return (
    <div className={isPending || isLoading ? 'opacity-60 pointer-events-none' : ''}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1
          className="text-3xl font-bold text-[#121A61]"
          style={{ fontFamily: 'Oswald, sans-serif' }}
        >
          Deportistas
        </h1>
        {canCreate && (
          <Link
            href="/deportistas/nuevo"
            className="flex items-center gap-2 bg-[#121A61] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#1E2A8A] transition-colors shrink-0"
          >
            <Plus size={16} />
            Nuevo deportista
          </Link>
        )}
      </div>
      <p className="text-[#6B7280] mb-6">
        Gestión del plantel deportivo
        {total > 0 && (
          <span className="ml-2 text-xs font-medium bg-gray-100 text-[#6B7280] px-2 py-0.5 rounded-full">
            {total} {total === 1 ? 'deportista' : 'deportistas'}
          </span>
        )}
      </p>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
            />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Buscar por nombre, apellido o DNI..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
            />
          </div>

          {/* Disciplina */}
          <CustomSelect
            value={filterDisciplina || '__all__'}
            onChange={(v) =>
              pushFilters({ 'filter[disciplina]': v === '__all__' ? undefined : v, 'page[number]': '1' })
            }
            options={[
              { value: '__all__', label: 'Todas las disciplinas' },
              ...Object.values(Disciplina).map((d) => ({ value: d, label: DISCIPLINA_LABELS[d] })),
            ]}
            searchable
            className="min-w-[160px]"
          />

          {/* Categoria */}
          <CustomSelect
            value={filterCategoria || '__all__'}
            onChange={(v) =>
              pushFilters({ 'filter[categoriaId]': v === '__all__' ? undefined : v, 'page[number]': '1' })
            }
            options={[
              { value: '__all__', label: 'Todas las categorías' },
              ...categorias.map((c) => ({ value: c.id, label: c.nombre })),
            ]}
            searchable
            className="min-w-[160px]"
          />

          {/* Estado */}
          <CustomSelect
            value={filterEstado || '__all__'}
            onChange={(v) =>
              pushFilters({ 'filter[estado]': v === '__all__' ? undefined : v, 'page[number]': '1' })
            }
            options={[
              { value: '__all__', label: 'Todos los estados' },
              ...Object.values(EstadoDeportista).map((e) => ({ value: e, label: ESTADO_LABELS[e] })),
            ]}
            className="min-w-[140px]"
          />

          {/* Clear */}
          {hasFilters && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#1C1C1C] border border-gray-200 rounded-lg px-3 py-2 transition-colors"
            >
              <X size={14} />
              Limpiar
            </button>
          )}
        </div>

        {/* Error state */}
        {isError && (
          <div className="px-5 py-6 text-sm text-center text-red-600">
            Error al cargar los deportistas. Por favor, intentá de nuevo.
          </div>
        )}

        {/* Mobile/tablet card list — hidden on lg+ */}
        {!isError && (
          <ul className="lg:hidden divide-y divide-gray-100">
            {deportistas.length === 0 && !isLoading ? (
              <li className="px-4 py-12 text-center text-sm text-[#6B7280]">
                No se encontraron deportistas
                {hasFilters && (
                  <button
                    onClick={handleClear}
                    className="ml-2 text-[#121A61] underline hover:no-underline"
                  >
                    Limpiar filtros
                  </button>
                )}
              </li>
            ) : (
              deportistas.map((item) => (
                <li key={item.id} className="px-4 py-4">
                  <Link
                    href={`/deportistas/${item.id}`}
                    className="flex items-start justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1C1C1C] truncate">
                        {item.attributes.apellido}, {item.attributes.nombre}
                      </p>
                      <p className="text-xs text-[#6B7280] mt-0.5">DNI: {item.attributes.dni}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span
                          className={[
                            'text-xs font-medium px-2.5 py-1 rounded-full',
                            ESTADO_BADGE[item.attributes.estado as EstadoType] ?? 'bg-gray-100 text-[#6B7280]',
                          ].join(' ')}
                        >
                          {ESTADO_LABELS[item.attributes.estado as EstadoType]}
                        </span>
                        {item.attributes.disciplina && (
                          <span className="text-xs text-[#6B7280]">
                            {DISCIPLINA_LABELS[item.attributes.disciplina as DisciplinaType]}
                          </span>
                        )}
                        {item.attributes.categoria && (
                          <span className="text-xs text-[#6B7280]">
                            {item.attributes.categoria.nombre}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#6B7280] mt-1">
                        Ingreso: {formatDate(item.attributes.fechaIngreso)}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-[#6B7280] shrink-0 mt-1" />
                  </Link>
                </li>
              ))
            )}
          </ul>
        )}

        {/* Desktop table — hidden below lg */}
        {!isError && (
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs uppercase text-[#6B7280] bg-[#F3F4F6] border-b border-gray-100">
                  <th className="px-5 py-3 text-left">Nombre</th>
                  <th className="px-5 py-3 text-left">DNI</th>
                  <th className="px-5 py-3 text-left">Disciplina</th>
                  <th className="px-5 py-3 text-left">Categoría</th>
                  <th className="px-5 py-3 text-left">Estado</th>
                  <th className="px-5 py-3 text-left">Fecha Ingreso</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {deportistas.length === 0 && !isLoading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-sm text-[#6B7280]"
                    >
                      No se encontraron deportistas
                      {hasFilters && (
                        <button
                          onClick={handleClear}
                          className="ml-2 text-[#121A61] underline hover:no-underline"
                        >
                          Limpiar filtros
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  deportistas.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-50 hover:bg-[#F3F4F6] transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3.5 text-sm font-medium text-[#1C1C1C]">
                        <Link
                          href={`/deportistas/${item.id}`}
                          className="hover:text-[#121A61] hover:underline"
                        >
                          {item.attributes.apellido}, {item.attributes.nombre}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[#6B7280]">{item.attributes.dni}</td>
                      <td className="px-5 py-3.5 text-sm text-[#6B7280]">
                        {item.attributes.disciplina
                          ? DISCIPLINA_LABELS[item.attributes.disciplina as DisciplinaType]
                          : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[#6B7280]">
                        {item.attributes.categoria
                          ? item.attributes.categoria.nombre
                          : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={[
                            'text-xs font-medium px-2.5 py-1 rounded-full',
                            ESTADO_BADGE[item.attributes.estado as EstadoType] ?? 'bg-gray-100 text-[#6B7280]',
                          ].join(' ')}
                        >
                          {ESTADO_LABELS[item.attributes.estado as EstadoType]}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[#6B7280]">
                        {formatDate(item.attributes.fechaIngreso)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link href={`/deportistas/${item.id}`}>
                          <ChevronRight size={16} className="text-[#6B7280] ml-auto" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
            <span className="text-sm text-[#6B7280]">
              Página {pageNumber} de {totalPages} ({total} deportistas)
            </span>
            <div className="flex gap-2">
              <button
                disabled={pageNumber <= 1}
                onClick={() => pushFilters({ 'page[number]': String(pageNumber - 1) })}
                className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-colors"
              >
                Anterior
              </button>
              <button
                disabled={pageNumber >= totalPages}
                onClick={() => pushFilters({ 'page[number]': String(pageNumber + 1) })}
                className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
