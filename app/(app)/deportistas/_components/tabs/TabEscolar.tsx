'use client';

import EnumSelect from '../EnumSelect';
import { NIVEL_ESTUDIO_LABELS } from '@/lib/utils/enum-labels';
import type { DeportistaFormData } from '@/lib/types/deportistas';

interface TabEscolarProps {
  data: DeportistaFormData;
  onChange: (patch: Partial<DeportistaFormData>) => void;
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

export default function TabEscolar({ data, onChange }: TabEscolarProps) {
  const escolar = data.datosEscolares ?? {};

  function patchEscolar(patch: NonNullable<DeportistaFormData['datosEscolares']>) {
    onChange({ datosEscolares: { ...escolar, ...patch } });
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
      <Field label="Nivel de estudio" id="nivelEstudio">
        <EnumSelect
          id="nivelEstudio"
          value={escolar.nivelEstudio ?? ''}
          onChange={(v) => patchEscolar({ nivelEstudio: v || undefined })}
          options={NIVEL_ESTUDIO_LABELS}
          placeholder="Seleccionar nivel..."
        />
      </Field>

      <div /> {/* spacer */}

      <Field label="Nombre del colegio" id="nombreColegio" className="sm:col-span-2">
        <input
          id="nombreColegio"
          type="text"
          value={escolar.nombreColegio ?? ''}
          onChange={(e) => patchEscolar({ nombreColegio: e.target.value })}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
        />
      </Field>

      <Field label="Año que cursa" id="anoCursa">
        <input
          id="anoCursa"
          type="number"
          min={0}
          max={12}
          value={escolar.anoCursa ?? ''}
          onChange={(e) =>
            patchEscolar({ anoCursa: e.target.value ? Number(e.target.value) : undefined })
          }
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
        />
      </Field>

      <div /> {/* spacer */}

      <Field label="Materias adeudadas" id="materiasAdeudadas" className="sm:col-span-2">
        <textarea
          id="materiasAdeudadas"
          value={escolar.materiasAdeudadas ?? ''}
          onChange={(e) => patchEscolar({ materiasAdeudadas: e.target.value })}
          rows={3}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30 resize-none"
        />
      </Field>
    </div>
  );
}
