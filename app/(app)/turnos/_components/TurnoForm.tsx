'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createTurno, updateTurno } from '@/lib/actions/turnos';
import type { TurnoListItem, TurnoFormData, Profesional } from '@/lib/types/turnos';
import DeportistaMultiSelect from './DeportistaMultiSelect';
import ProfesionalCombobox from './ProfesionalCombobox';

interface Props {
  mode: 'create' | 'edit';
  isAdmin: boolean;
  profesionales: Profesional[];
  initialData?: TurnoListItem;
}

interface DeportistaOption {
  id: string;
  nombre: string;
  apellido: string;
}

export default function TurnoForm({ mode, isAdmin, profesionales, initialData }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [titulo, setTitulo] = useState(initialData?.titulo ?? '');
  const [fecha, setFecha] = useState(initialData?.fecha ?? '');
  const [hora, setHora] = useState(initialData?.hora ?? '');
  const [lugar, setLugar] = useState(initialData?.lugar ?? '');
  const [descripcion, setDescripcion] = useState(initialData?.descripcion ?? '');
  const [profesionalId, setProfesionalId] = useState(initialData?.profesionalId ?? '');
  const [deportistas, setDeportistas] = useState<DeportistaOption[]>(
    initialData?.deportistas ?? [],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const data: TurnoFormData = {
      titulo,
      fecha,
      hora,
      lugar,
      descripcion: descripcion || undefined,
      profesionalId,
      deportistaIds: deportistas.map((d) => d.id),
    };

    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createTurno(data)
          : await updateTurno(initialData!.id, data);

      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push('/turnos');
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-5">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {isAdmin && (
        <div>
          <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
            Área responsable <span className="text-red-500">*</span>
          </label>
          <ProfesionalCombobox
            profesionales={profesionales}
            value={profesionalId}
            onChange={setProfesionalId}
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
          Título <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          required
          placeholder="Ej: Revisión médica pretemporada"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
            Fecha <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
            Hora <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            required
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
          Lugar <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={lugar}
          onChange={(e) => setLugar(e.target.value)}
          required
          placeholder="Ej: Consultorio 3 — Sector Médico"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">Descripción</label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={3}
          placeholder="Detalles adicionales del turno..."
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">Deportista/s</label>
        <DeportistaMultiSelect value={deportistas} onChange={setDeportistas} />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push('/turnos')}
          disabled={isPending}
          className="text-sm text-[#6B7280] hover:text-[#1C1C1C] border border-gray-200 rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 bg-[#121A61] text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-[#1E2A8A] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              {mode === 'create' ? 'Guardando...' : 'Actualizando...'}
            </>
          ) : mode === 'create' ? (
            'Guardar turno'
          ) : (
            'Actualizar turno'
          )}
        </button>
      </div>
    </form>
  );
}
