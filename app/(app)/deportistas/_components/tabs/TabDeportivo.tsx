'use client';

import EnumSelect from '../EnumSelect';
import ClubAnteriorList from '../ClubAnteriorList';
import {
  ESTADO_LABELS,
  ACTIVIDAD_COMPLEMENTARIA_LABELS,
} from '@/lib/utils/enum-labels';
import type { DeportistaFormData } from '@/lib/types/deportistas';

interface TabDeportivoProps {
  data: DeportistaFormData;
  errors?: Partial<Record<string, string>>;
  onChange: (patch: Partial<DeportistaFormData>) => void;
  disabled?: boolean;
  disciplinas?: Array<{ id: string; nombre: string; categorias: { id: string; nombre: string }[] }>;
}

function Field({
  label,
  id,
  children,
  className = '',
}: {
  label: string;
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="block text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-1"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls = (disabled: boolean) =>
  [
    'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30',
    disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : '',
  ]
    .filter(Boolean)
    .join(' ');

export default function TabDeportivo({
  data,
  onChange,
  disabled = false,
  disciplinas = [],
}: TabDeportivoProps) {
  const disciplinaOptions = Object.fromEntries(disciplinas.map((d) => [d.id, d.nombre]));
  const selectedDisciplina = disciplinas.find((d) => d.id === data.disciplinaId);
  const categorias = selectedDisciplina?.categorias ?? [];
  const categoriaOptions = Object.fromEntries(categorias.map((c) => [c.id, c.nombre]));
  const hasDisciplina = !!data.disciplinaId;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
      {/* Fila 1 */}
      <Field label="Disciplina" id="disciplina">
        <EnumSelect
          id="disciplina"
          value={data.disciplinaId ?? ''}
          onChange={(v) => {
            const nextDisciplina = disciplinas.find((d) => d.id === v);
            const categoriaValida =
              !!data.categoriaId &&
              !!nextDisciplina?.categorias.some((c) => c.id === data.categoriaId);
            onChange({
              disciplinaId: v || undefined,
              categoriaId: categoriaValida ? data.categoriaId : undefined,
            });
          }}
          options={disciplinaOptions}
          placeholder="Seleccionar disciplina..."
          disabled={disabled}
        />
      </Field>

      <Field label="Categoría" id="categoria">
        <EnumSelect
          id="categoria"
          value={data.categoriaId ?? ''}
          onChange={(v) => onChange({ categoriaId: v || undefined })}
          options={categoriaOptions}
          placeholder={hasDisciplina ? 'Seleccionar categoría...' : 'Seleccioná una disciplina primero'}
          disabled={disabled || !hasDisciplina}
        />
      </Field>

      {/* Fila 2 */}
      <Field label="Posición" id="posicion">
        <input
          id="posicion"
          type="text"
          value={data.posicion ?? ''}
          onChange={(e) => onChange({ posicion: e.target.value })}
          disabled={disabled}
          className={inputCls(disabled)}
        />
      </Field>

      <Field label="Estado" id="estado">
        <EnumSelect
          id="estado"
          value={data.estado}
          onChange={(v) => onChange({ estado: v || 'ACTIVO' })}
          options={ESTADO_LABELS}
          placeholder="Seleccionar estado..."
          disabled={disabled}
        />
      </Field>

      {/* Fila 3 */}
      <Field label="Actividad complementaria" id="actividadComplementaria">
        <EnumSelect
          id="actividadComplementaria"
          value={data.actividadComplementaria ?? ''}
          onChange={(v) => onChange({ actividadComplementaria: v || undefined })}
          options={ACTIVIDAD_COMPLEMENTARIA_LABELS}
          placeholder="Seleccionar actividad..."
          disabled={disabled}
        />
      </Field>

      <Field label="Fecha de ingreso" id="fechaIngreso">
        <input
          id="fechaIngreso"
          type="date"
          value={data.fechaIngreso ?? ''}
          onChange={(e) => onChange({ fechaIngreso: e.target.value })}
          disabled={disabled}
          className={inputCls(disabled)}
        />
      </Field>

      {/* Fila 4: checkbox */}
      <div className="sm:col-span-2">
        <label className={`flex items-center gap-2${disabled ? ' opacity-50 cursor-not-allowed' : ' cursor-pointer'}`}>
          <input
            id="esRepresentante"
            type="checkbox"
            checked={data.esRepresentante}
            onChange={(e) => onChange({ esRepresentante: e.target.checked })}
            disabled={disabled}
            className="w-4 h-4 text-[#121A61] rounded border-gray-300 focus:ring-[#3346CC]/30"
          />
          <span className="text-sm text-[#1C1C1C]">Es representante</span>
        </label>
      </div>

      {/* Clubes anteriores */}
      <div className="sm:col-span-2">
        <ClubAnteriorList
          clubs={data.clubesAnteriores}
          onChange={(clubs) => onChange({ clubesAnteriores: clubs })}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
