'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { CustomSelect } from '@/app/components/ui/custom-select';
import type { PeriodoDivision } from '@/lib/types/trayectoria';
import {
  crearTransicionDivision,
  updatePasoPorDivision,
  deletePasoPorDivision,
} from '@/lib/actions/trayectoria';

interface Catalogo {
  id: string;
  nombre: string;
}

interface Props {
  deportistaId: string;
  periodos: PeriodoDivision[];
  disciplinas: Catalogo[];
  categorias: Catalogo[];
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr + 'T00:00:00'));
}

function toOptions(items: Catalogo[]) {
  return [
    { value: '', label: 'Sin asignar' },
    ...items.map((i) => ({ value: i.id, label: i.nombre })),
  ];
}

export default function GestionDivisionesModal({
  deportistaId,
  periodos,
  disciplinas,
  categorias,
}: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formulario de nueva transición
  const [nuevaDisciplina, setNuevaDisciplina] = useState('');
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [nuevaFecha, setNuevaFecha] = useState('');

  // Edición de período existente
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editDisciplina, setEditDisciplina] = useState('');
  const [editCategoria, setEditCategoria] = useState('');
  const [editDesde, setEditDesde] = useState('');
  const [editHasta, setEditHasta] = useState('');

  const disciplinaOptions = toOptions(disciplinas);
  const categoriaOptions = toOptions(categorias);

  const periodosOrdenados = [...periodos].sort((a, b) => b.desde.localeCompare(a.desde));

  function close() {
    setIsOpen(false);
    setError(null);
    setEditandoId(null);
    setNuevaDisciplina('');
    setNuevaCategoria('');
    setNuevaFecha('');
  }

  async function handleCrear() {
    if (!nuevaFecha) {
      setError('La fecha es obligatoria');
      return;
    }
    setLoading(true);
    setError(null);
    const result = await crearTransicionDivision({
      deportistaId,
      categoriaId: nuevaCategoria || null,
      disciplinaId: nuevaDisciplina || null,
      fecha: nuevaFecha,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setNuevaDisciplina('');
    setNuevaCategoria('');
    setNuevaFecha('');
    router.refresh();
  }

  function startEdit(p: PeriodoDivision) {
    setEditandoId(p.id);
    setEditDisciplina(p.disciplinaId ?? '');
    setEditCategoria(p.categoriaId ?? '');
    setEditDesde(p.desde);
    setEditHasta(p.hasta ?? '');
    setError(null);
  }

  async function handleUpdate() {
    if (!editandoId) return;
    if (!editDesde) {
      setError('La fecha de inicio es obligatoria');
      return;
    }
    setLoading(true);
    setError(null);
    const result = await updatePasoPorDivision({
      id: editandoId,
      categoriaId: editCategoria || null,
      disciplinaId: editDisciplina || null,
      desde: editDesde,
      hasta: editHasta || null,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setEditandoId(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    setLoading(true);
    setError(null);
    const result = await deletePasoPorDivision(id);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    if (editandoId === id) setEditandoId(null);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-[#121A61] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#1E2A8A] transition-colors shrink-0"
      >
        <Plus size={15} />
        Registrar cambio de división
      </button>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gestion-divisiones-title"
        data-testid="gestion-divisiones-modal"
        style={{ display: isOpen ? 'flex' : 'none' }}
        className="fixed inset-0 z-50 items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      >
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2
              id="gestion-divisiones-title"
              className="text-lg font-bold text-[#1C1C1C]"
              style={{ fontFamily: 'Oswald, sans-serif' }}
            >
              Gestión de divisiones
            </h2>
            <button
              type="button"
              onClick={close}
              className="text-[#6B7280] hover:text-[#1C1C1C] transition-colors"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-6 py-4">
            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Registrar cambio de división */}
            <section className="mb-8">
              <h3 className="text-sm font-semibold text-[#1C1C1C] mb-3">
                Registrar cambio de división
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs text-[#6B7280] mb-1">Disciplina</label>
                  <CustomSelect
                    value={nuevaDisciplina}
                    onChange={setNuevaDisciplina}
                    options={disciplinaOptions}
                    placeholder="Sin asignar"
                    searchable
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#6B7280] mb-1">Categoría</label>
                  <CustomSelect
                    value={nuevaCategoria}
                    onChange={setNuevaCategoria}
                    options={categoriaOptions}
                    placeholder="Sin asignar"
                    searchable
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#6B7280] mb-1">Fecha</label>
                  <input
                    type="date"
                    value={nuevaFecha}
                    onChange={(e) => setNuevaFecha(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleCrear}
                disabled={loading}
                className="mt-3 flex items-center gap-2 bg-[#121A61] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#1E2A8A] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Registrar
              </button>
            </section>

            {/* Períodos existentes */}
            <section>
              <h3 className="text-sm font-semibold text-[#1C1C1C] mb-3">
                Períodos registrados
              </h3>
              {periodosOrdenados.length === 0 ? (
                <p className="text-sm text-[#6B7280]">No hay períodos registrados.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {periodosOrdenados.map((p) => (
                    <li key={p.id} className="py-3">
                      {editandoId === p.id ? (
                        <div className="space-y-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="block text-xs text-[#6B7280] mb-1">
                                Disciplina
                              </label>
                              <CustomSelect
                                value={editDisciplina}
                                onChange={setEditDisciplina}
                                options={disciplinaOptions}
                                placeholder="Sin asignar"
                                searchable
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-[#6B7280] mb-1">
                                Categoría
                              </label>
                              <CustomSelect
                                value={editCategoria}
                                onChange={setEditCategoria}
                                options={categoriaOptions}
                                placeholder="Sin asignar"
                                searchable
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-[#6B7280] mb-1">Desde</label>
                              <input
                                type="date"
                                value={editDesde}
                                onChange={(e) => setEditDesde(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-[#6B7280] mb-1">
                                Hasta (vacío = actual)
                              </label>
                              <input
                                type="date"
                                value={editHasta}
                                onChange={(e) => setEditHasta(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleUpdate}
                              disabled={loading}
                              className="flex items-center gap-2 bg-[#121A61] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#1E2A8A] transition-colors disabled:opacity-60"
                            >
                              {loading && <Loader2 size={14} className="animate-spin" />}
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditandoId(null)}
                              disabled={loading}
                              className="text-sm text-[#6B7280] hover:text-[#1C1C1C] border border-gray-200 rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-[#1C1C1C]">
                              {[p.categoriaNombre, p.disciplinaNombre]
                                .filter(Boolean)
                                .join(' · ') || 'Sin división'}
                            </p>
                            <p className="text-xs text-[#6B7280]">
                              {formatDate(p.desde)} – {p.hasta ? formatDate(p.hasta) : 'Actual'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => startEdit(p)}
                              disabled={loading}
                              className="p-2 text-[#6B7280] hover:text-[#121A61] rounded-lg hover:bg-[#F3F4F6] transition-colors disabled:opacity-50"
                              aria-label="Editar período"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(p.id)}
                              disabled={loading}
                              className="p-2 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                              aria-label="Eliminar período"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
