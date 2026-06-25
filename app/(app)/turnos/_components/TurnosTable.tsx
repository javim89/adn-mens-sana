'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import type { TurnoListItem } from '@/lib/types/turnos';
import DeleteTurnoModal from './DeleteTurnoModal';

interface Props {
  initialTurnos: TurnoListItem[];
  isAdmin: boolean;
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr + 'T00:00:00'));
}

export default function TurnosTable({ initialTurnos, isAdmin }: Props) {
  const [turnos, setTurnos] = useState(initialTurnos);

  function handleDeleted(id: string) {
    setTurnos((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1
          className="text-3xl font-bold text-[#121A61]"
          style={{ fontFamily: 'Oswald, sans-serif' }}
        >
          Turnos
        </h1>
        <Link
          href="/turnos/nuevo"
          className="flex items-center gap-2 bg-[#121A61] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#1E2A8A] transition-colors shrink-0"
        >
          <Plus size={16} />
          Nuevo turno
        </Link>
      </div>
      <p className="text-[#6B7280] mb-6">
        Agenda de evaluaciones y seguimiento
        {turnos.length > 0 && (
          <span className="ml-2 text-xs font-medium bg-gray-100 text-[#6B7280] px-2 py-0.5 rounded-full">
            {turnos.length} {turnos.length === 1 ? 'turno' : 'turnos'}
          </span>
        )}
      </p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Mobile card list */}
        <ul className="lg:hidden divide-y divide-gray-100">
          {turnos.length === 0 ? (
            <li className="px-4 py-12 text-center text-sm text-[#6B7280]">
              No hay turnos cargados.{' '}
              <Link href="/turnos/nuevo" className="text-[#121A61] underline hover:no-underline">
                Crear el primero
              </Link>
            </li>
          ) : (
            turnos.map((t) => (
              <li key={t.id} className="px-4 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1C1C1C] truncate">{t.titulo}</p>
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      {formatDate(t.fecha)} — {t.hora}hs — {t.lugar}
                    </p>
                    {isAdmin && (
                      <p className="text-xs text-[#6B7280] mt-0.5">
                        Responsable: {t.profesionalNombre}
                      </p>
                    )}
                    {t.deportistas.length > 0 && (
                      <p className="text-xs text-[#6B7280] mt-1">
                        {t.deportistas.map((d) => `${d.apellido}, ${d.nombre}`).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Link
                      href={`/turnos/${t.id}/editar`}
                      className="text-[#6B7280] hover:text-[#121A61] transition-colors p-1"
                      title="Editar turno"
                    >
                      <Pencil size={15} />
                    </Link>
                    <DeleteTurnoModal
                      turnoId={t.id}
                      turnoTitulo={t.titulo}
                      onDeleted={() => handleDeleted(t.id)}
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
                <th className="px-5 py-3 text-left">Título</th>
                <th className="px-5 py-3 text-left">Fecha</th>
                <th className="px-5 py-3 text-left">Hora</th>
                <th className="px-5 py-3 text-left">Lugar</th>
                {isAdmin && <th className="px-5 py-3 text-left">Área responsable</th>}
                <th className="px-5 py-3 text-left">Deportista/s</th>
                <th className="px-5 py-3 text-left">Descripción</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {turnos.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 8 : 7}
                    className="px-5 py-12 text-center text-sm text-[#6B7280]"
                  >
                    No hay turnos cargados.{' '}
                    <Link
                      href="/turnos/nuevo"
                      className="text-[#121A61] underline hover:no-underline"
                    >
                      Crear el primero
                    </Link>
                  </td>
                </tr>
              ) : (
                turnos.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-gray-50 hover:bg-[#F3F4F6] transition-colors"
                  >
                    <td className="px-5 py-3.5 text-sm font-medium text-[#1C1C1C] max-w-[180px]">
                      <span className="block truncate" title={t.titulo}>
                        {t.titulo}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#6B7280] whitespace-nowrap">
                      {formatDate(t.fecha)}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#6B7280] whitespace-nowrap">
                      {t.hora}hs
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#6B7280] max-w-[160px]">
                      <span className="block truncate" title={t.lugar}>
                        {t.lugar}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-3.5 text-sm text-[#6B7280]">
                        {t.profesionalNombre}
                      </td>
                    )}
                    <td className="px-5 py-3.5 text-sm text-[#6B7280] max-w-[200px]">
                      {t.deportistas.length === 0 ? (
                        <span className="text-gray-300">—</span>
                      ) : (
                        <span className="block truncate" title={t.deportistas.map((d) => `${d.apellido}, ${d.nombre}`).join(', ')}>
                          {t.deportistas.map((d) => `${d.apellido}, ${d.nombre}`).join(', ')}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#6B7280] max-w-[200px]">
                      {t.descripcion ? (
                        <span className="block truncate" title={t.descripcion}>
                          {t.descripcion}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 justify-end">
                        <Link
                          href={`/turnos/${t.id}/editar`}
                          className="text-[#6B7280] hover:text-[#121A61] transition-colors p-1"
                          title="Editar turno"
                        >
                          <Pencil size={15} />
                        </Link>
                        <DeleteTurnoModal
                          turnoId={t.id}
                          turnoTitulo={t.titulo}
                          onDeleted={() => handleDeleted(t.id)}
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
    </div>
  );
}
