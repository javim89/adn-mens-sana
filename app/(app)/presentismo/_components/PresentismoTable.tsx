'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Plus, Pencil, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { CustomSelect } from '@/app/components/ui/custom-select';
import { TIPO_SESION_LABELS } from '@/lib/utils/asistencia';
import type { TipoSesion } from '@/lib/types/presentismo';
import DeleteEntrenamientoModal from './DeleteEntrenamientoModal';

export interface EntrenamientoListItem {
  id: string;
  fecha: string;
  disciplinaNombre: string;
  categoriaNombre: string;
  tipoSesion: TipoSesion;
  totalAsistencias: number;
  presentes: number;
}

interface DisciplinaOption {
  id: string;
  nombre: string;
}

interface Props {
  items: EntrenamientoListItem[];
  total: number;
  page: number; // 0-based
  pageSize: number;
  disciplinas: DisciplinaOption[];
  currentDisciplina: string;
  currentTipoSesion: string;
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr + 'T00:00:00'));
}

export default function PresentismoTable({
  items,
  total,
  page,
  pageSize,
  disciplinas,
  currentDisciplina,
  currentTipoSesion,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages - 1);

  function buildUrl(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function navigate(url: string) {
    startTransition(() => router.push(url));
  }

  function handleDisciplinaChange(value: string) {
    navigate(buildUrl({ disciplina: value || null, page: null }));
  }

  function handleTipoSesionChange(value: string) {
    navigate(buildUrl({ tipo: value || null, page: null }));
  }

  function goToPage(target: number) {
    const clamped = Math.max(0, Math.min(target, totalPages - 1));
    navigate(buildUrl({ page: clamped === 0 ? null : String(clamped) }));
  }

  function handleDeleted() {
    startTransition(() => router.refresh());
  }

  const from = total === 0 ? 0 : currentPage * pageSize + 1;
  const to = Math.min(total, currentPage * pageSize + items.length);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1
          className="text-3xl font-bold text-[#121A61]"
          style={{ fontFamily: 'Oswald, sans-serif' }}
        >
          Presentismo
        </h1>
        <Link
          href="/presentismo/nuevo"
          className="flex items-center gap-2 bg-[#121A61] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#1E2A8A] transition-colors shrink-0"
        >
          <Plus size={16} />
          Nuevo entrenamiento
        </Link>
      </div>
      <p className="text-[#6B7280] mb-6">
        Registro de asistencia a entrenamientos
        {total > 0 && (
          <span className="ml-2 text-xs font-medium bg-gray-100 text-[#6B7280] px-2 py-0.5 rounded-full">
            {total} {total === 1 ? 'entrenamiento' : 'entrenamientos'}
          </span>
        )}
      </p>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <CustomSelect
          value={currentDisciplina || '__all__'}
          onChange={(v) => handleDisciplinaChange(v === '__all__' ? '' : v)}
          searchable
          options={[
            { value: '__all__', label: 'Todas las disciplinas' },
            ...disciplinas.map((d) => ({ value: d.id, label: d.nombre })),
          ]}
          className="min-w-[180px]"
        />
        <CustomSelect
          value={currentTipoSesion || '__all__'}
          onChange={(v) => handleTipoSesionChange(v === '__all__' ? '' : v)}
          options={[
            { value: '__all__', label: 'Todos los tipos' },
            ...Object.entries(TIPO_SESION_LABELS).map(([value, label]) => ({ value, label })),
          ]}
          className="min-w-[160px]"
        />
      </div>

      <div
        className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-opacity ${isPending ? 'opacity-60' : ''}`}
      >
        {/* Mobile card list */}
        <ul className="lg:hidden divide-y divide-gray-100">
          {items.length === 0 ? (
            <li className="px-4 py-12 text-center text-sm text-[#6B7280]">
              No hay entrenamientos cargados.{' '}
              <Link
                href="/presentismo/nuevo"
                className="text-[#121A61] underline hover:no-underline"
              >
                Crear el primero
              </Link>
            </li>
          ) : (
            items.map((e) => (
              <li key={e.id} className="px-4 py-4">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/presentismo/${e.id}`} className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1C1C1C]">
                      {formatDate(e.fecha)} — {TIPO_SESION_LABELS[e.tipoSesion]}
                    </p>
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      {e.disciplinaNombre} · {e.categoriaNombre}
                    </p>
                    <p className="text-xs text-[#6B7280] mt-1">
                      {e.presentes}/{e.totalAsistencias} presentes
                    </p>
                  </Link>
                  <div className="flex items-center gap-1 shrink-0">
                    <Link
                      href={`/presentismo/${e.id}`}
                      className="text-[#6B7280] hover:text-[#121A61] transition-colors p-1"
                      title="Ver entrenamiento"
                    >
                      <Eye size={15} />
                    </Link>
                    <Link
                      href={`/presentismo/${e.id}/editar`}
                      className="text-[#6B7280] hover:text-[#121A61] transition-colors p-1"
                      title="Editar entrenamiento"
                    >
                      <Pencil size={15} />
                    </Link>
                    <DeleteEntrenamientoModal
                      entrenamientoId={e.id}
                      entrenamientoLabel={`${formatDate(e.fecha)} — ${e.disciplinaNombre}`}
                      onDeleted={handleDeleted}
                    />
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>

        {/* Desktop table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs uppercase text-[#6B7280] bg-[#F3F4F6] border-b border-gray-100">
                <th className="px-5 py-3 text-left">Fecha</th>
                <th className="px-5 py-3 text-left">Disciplina</th>
                <th className="px-5 py-3 text-left">Categoría</th>
                <th className="px-5 py-3 text-left">Tipo de sesión</th>
                <th className="px-5 py-3 text-left">Asistencia</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-[#6B7280]">
                    No hay entrenamientos cargados.{' '}
                    <Link
                      href="/presentismo/nuevo"
                      className="text-[#121A61] underline hover:no-underline"
                    >
                      Crear el primero
                    </Link>
                  </td>
                </tr>
              ) : (
                items.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-gray-50 hover:bg-[#F3F4F6] transition-colors"
                  >
                    <td className="px-5 py-3.5 text-sm font-medium text-[#1C1C1C] whitespace-nowrap">
                      <Link
                        href={`/presentismo/${e.id}`}
                        className="hover:text-[#121A61] hover:underline"
                      >
                        {formatDate(e.fecha)}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#6B7280]">{e.disciplinaNombre}</td>
                    <td className="px-5 py-3.5 text-sm text-[#6B7280]">{e.categoriaNombre}</td>
                    <td className="px-5 py-3.5 text-sm text-[#6B7280]">
                      {TIPO_SESION_LABELS[e.tipoSesion]}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#6B7280] whitespace-nowrap">
                      {e.presentes}/{e.totalAsistencias} presentes
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 justify-end">
                        <Link
                          href={`/presentismo/${e.id}`}
                          className="text-[#6B7280] hover:text-[#121A61] transition-colors p-1"
                          title="Ver entrenamiento"
                        >
                          <Eye size={15} />
                        </Link>
                        <Link
                          href={`/presentismo/${e.id}/editar`}
                          className="text-[#6B7280] hover:text-[#121A61] transition-colors p-1"
                          title="Editar entrenamiento"
                        >
                          <Pencil size={15} />
                        </Link>
                        <DeleteEntrenamientoModal
                          entrenamientoId={e.id}
                          entrenamientoLabel={`${formatDate(e.fecha)} — ${e.disciplinaNombre}`}
                          onDeleted={handleDeleted}
                        />
                      </div>
                    </td>
                  </tr>
                ))
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
