'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Search } from 'lucide-react';
import type { SeguimientoListItem } from '@/lib/types/seguimientos';
import DeleteSeguimientoModal from './DeleteSeguimientoModal';

interface Props {
  initialSeguimientos: SeguimientoListItem[];
  isAdmin: boolean;
  canWrite: boolean;
  currentUserId: string;
}

const PRIORIDAD_LABELS: Record<string, string> = {
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
  URGENTE: 'Urgente',
};

const PRIORIDAD_STYLES: Record<string, string> = {
  BAJA: 'bg-[#D1FAE5] text-[#065F46]',
  MEDIA: 'bg-[#FEF9C3] text-[#713F12]',
  ALTA: 'bg-[#FED7AA] text-[#7C2D12]',
  URGENTE: 'bg-[#FEE2E2] text-[#7F1D1D]',
};

function PrioridadBadge({ prioridad }: { prioridad: string }) {
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
  isAdmin,
  canWrite,
  currentUserId,
}: Props) {
  const [seguimientos, setSeguimientos] = useState(initialSeguimientos);
  const [searchQuery, setSearchQuery] = useState('');
  const [prioridadFilter, setPrioridadFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');

  function handleDeleted(id: string) {
    setSeguimientos((prev) => prev.filter((s) => s.id !== id));
  }

  // Unique list of professionals for area filter (admin only)
  const profesionalesUnicos = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of initialSeguimientos) {
      if (!map.has(s.profesionalId)) {
        map.set(s.profesionalId, s.profesionalNombre);
      }
    }
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [initialSeguimientos]);

  const filtered = useMemo(() => {
    return seguimientos.filter((s) => {
      if (
        searchQuery &&
        !s.titulo.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !s.deportistaNombre.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      if (prioridadFilter && s.prioridad !== prioridadFilter) return false;
      if (areaFilter && s.profesionalId !== areaFilter) return false;
      return true;
    });
  }, [seguimientos, searchQuery, prioridadFilter, areaFilter]);

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
        {seguimientos.length > 0 && (
          <span className="ml-2 text-xs font-medium bg-gray-100 text-[#6B7280] px-2 py-0.5 rounded-full">
            {seguimientos.length} {seguimientos.length === 1 ? 'seguimiento' : 'seguimientos'}
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título o deportista..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30 bg-white"
          />
        </div>

        <select
          value={prioridadFilter}
          onChange={(e) => setPrioridadFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30 bg-white"
        >
          <option value="">Todas las prioridades</option>
          <option value="BAJA">Baja</option>
          <option value="MEDIA">Media</option>
          <option value="ALTA">Alta</option>
          <option value="URGENTE">Urgente</option>
        </select>

        {isAdmin && profesionalesUnicos.length > 0 && (
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30 bg-white"
          >
            <option value="">Todas las áreas</option>
            {profesionalesUnicos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Mobile card list */}
        <ul className="lg:hidden divide-y divide-gray-100">
          {filtered.length === 0 ? (
            <li className="px-4 py-12 text-center text-sm text-[#6B7280]">
              No hay seguimientos.{' '}
              {canWrite && (
                <Link href="/seguimientos/nuevo" className="text-[#121A61] underline hover:no-underline">
                  Crear el primero
                </Link>
              )}
            </li>
          ) : (
            filtered.map((s) => {
              const canModifyRow = isAdmin || s.profesionalId === currentUserId;
              return (
                <li key={s.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Link
                          href={`/seguimientos/${s.id}`}
                          className="text-sm font-semibold text-[#1C1C1C] hover:text-[#121A61] truncate transition-colors"
                        >
                          {s.titulo}
                        </Link>
                        <PrioridadBadge prioridad={s.prioridad} />
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
                    {canModifyRow && (
                      <div className="flex items-center gap-1 shrink-0">
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
                          onDeleted={() => handleDeleted(s.id)}
                        />
                      </div>
                    )}
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
                {isAdmin && <th className="px-5 py-3 text-left">Área responsable</th>}
                <th className="px-5 py-3 text-left">Próxima cita</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 7 : 6}
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
                filtered.map((s) => {
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
                        {canModifyRow && (
                          <div className="flex items-center gap-1 justify-end">
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
                              onDeleted={() => handleDeleted(s.id)}
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
