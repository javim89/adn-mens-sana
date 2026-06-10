'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Plus, ChevronRight, X } from 'lucide-react';
import { useCallback, useState, useTransition } from 'react';
import type { DeportistaListItem } from '@/lib/types/deportistas';
import {
  DISCIPLINA_LABELS,
  CATEGORIA_LABELS,
  ESTADO_LABELS,
} from '@/lib/utils/enum-labels';
import {
  Disciplina,
  Categoria,
  EstadoDeportista,
} from '@/lib/generated/prisma/enums';
import type { Disciplina as DisciplinaType, Categoria as CategoriaType, EstadoDeportista as EstadoType } from '@/lib/generated/prisma/enums';

interface DeportistasTableProps {
  deportistas: DeportistaListItem[];
  total: number;
  page: number;
  pageSize: number;
  filters: {
    search?: string;
    disciplina?: string;
    categoria?: string;
    estado?: string;
  };
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

const ESTADO_BADGE: Record<string, string> = {
  ACTIVO: 'bg-green-100 text-green-700',
  INACTIVO: 'bg-gray-100 text-[#6B7280]',
  LESIONADO: 'bg-amber-100 text-amber-700',
  SUSPENDIDO: 'bg-red-100 text-red-700',
};

export default function DeportistasTable({
  deportistas,
  total,
  page,
  pageSize,
  filters,
}: DeportistasTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [localSearch, setLocalSearch] = useState(filters.search ?? '');

  const hasFilters = Object.values(filters).some(Boolean);
  const totalPages = Math.ceil(total / pageSize);

  const pushFilters = useCallback(
    (overrides: Partial<typeof filters> & { page?: string }) => {
      const params = new URLSearchParams();
      const merged = { ...filters, ...overrides };
      if (merged.search) params.set('search', merged.search);
      if (merged.disciplina) params.set('disciplina', merged.disciplina);
      if (merged.categoria) params.set('categoria', merged.categoria);
      if (merged.estado) params.set('estado', merged.estado);
      if (overrides.page) params.set('page', overrides.page);
      startTransition(() => {
        router.push('/deportistas?' + params.toString());
      });
    },
    [filters, router],
  );

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      pushFilters({ search: localSearch, page: '1' });
    }
  }

  function handleClear() {
    setLocalSearch('');
    startTransition(() => {
      router.push('/deportistas');
    });
  }

  return (
    <div className={isPending ? 'opacity-60 pointer-events-none' : ''}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h1
          className="text-3xl font-bold text-[#121A61]"
          style={{ fontFamily: 'Oswald, sans-serif' }}
        >
          Deportistas
        </h1>
        <Link
          href="/deportistas/nuevo"
          className="flex items-center gap-2 bg-[#121A61] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#1E2A8A] transition-colors"
        >
          <Plus size={16} />
          Nuevo deportista
        </Link>
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
          <select
            value={filters.disciplina ?? ''}
            onChange={(e) => pushFilters({ disciplina: e.target.value || undefined, page: '1' })}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30 text-[#1C1C1C]"
          >
            <option value="">Todas las disciplinas</option>
            {Object.values(Disciplina).map((d) => (
              <option key={d} value={d}>
                {DISCIPLINA_LABELS[d]}
              </option>
            ))}
          </select>

          {/* Categoria */}
          <select
            value={filters.categoria ?? ''}
            onChange={(e) => pushFilters({ categoria: e.target.value || undefined, page: '1' })}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30 text-[#1C1C1C]"
          >
            <option value="">Todas las categorías</option>
            {Object.values(Categoria).map((c) => (
              <option key={c} value={c}>
                {CATEGORIA_LABELS[c]}
              </option>
            ))}
          </select>

          {/* Estado */}
          <select
            value={filters.estado ?? ''}
            onChange={(e) => pushFilters({ estado: e.target.value || undefined, page: '1' })}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30 text-[#1C1C1C]"
          >
            <option value="">Todos los estados</option>
            {Object.values(EstadoDeportista).map((e) => (
              <option key={e} value={e}>
                {ESTADO_LABELS[e]}
              </option>
            ))}
          </select>

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

        {/* Table */}
        <div className="overflow-x-auto">
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
              {deportistas.length === 0 ? (
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
                deportistas.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-gray-50 hover:bg-[#F3F4F6] transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5 text-sm font-medium text-[#1C1C1C]">
                      <Link
                        href={`/deportistas/${d.id}`}
                        className="hover:text-[#121A61] hover:underline"
                      >
                        {d.apellido}, {d.nombre}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#6B7280]">{d.dni}</td>
                    <td className="px-5 py-3.5 text-sm text-[#6B7280]">
                      {d.disciplina ? DISCIPLINA_LABELS[d.disciplina as DisciplinaType] : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#6B7280]">
                      {d.categoria ? CATEGORIA_LABELS[d.categoria as CategoriaType] : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={[
                          'text-xs font-medium px-2.5 py-1 rounded-full',
                          ESTADO_BADGE[d.estado as EstadoType] ?? 'bg-gray-100 text-[#6B7280]',
                        ].join(' ')}
                      >
                        {ESTADO_LABELS[d.estado as EstadoType]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#6B7280]">
                      {formatDate(d.fechaIngreso)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link href={`/deportistas/${d.id}`}>
                        <ChevronRight size={16} className="text-[#6B7280] ml-auto" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
            <span className="text-sm text-[#6B7280]">
              Página {page} de {totalPages} ({total} deportistas)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => pushFilters({ page: String(page - 1) })}
                className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-colors"
              >
                Anterior
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => pushFilters({ page: String(page + 1) })}
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
