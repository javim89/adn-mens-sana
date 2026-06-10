'use client';

import EnumSelect from '../EnumSelect';
import { GENERO_LABELS } from '@/lib/utils/enum-labels';
import type { DeportistaFormData } from '@/lib/types/deportistas';

interface TabPersonalProps {
  data: DeportistaFormData;
  errors: Partial<Record<string, string>>;
  onChange: (patch: Partial<DeportistaFormData>) => void;
}

function Field({
  label,
  id,
  error,
  children,
  className = '',
}: {
  label: string;
  id: string;
  error?: string;
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
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function TabPersonal({ data, errors, onChange }: TabPersonalProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
      {/* Fila 1 */}
      <Field label="Apellido *" id="apellido" error={errors.apellido}>
        <input
          id="apellido"
          type="text"
          value={data.apellido}
          onChange={(e) => onChange({ apellido: e.target.value })}
          className={[
            'w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30',
            errors.apellido ? 'border-red-400' : 'border-gray-200',
          ].join(' ')}
        />
      </Field>

      <Field label="Nombre *" id="nombre" error={errors.nombre}>
        <input
          id="nombre"
          type="text"
          value={data.nombre}
          onChange={(e) => onChange({ nombre: e.target.value })}
          className={[
            'w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30',
            errors.nombre ? 'border-red-400' : 'border-gray-200',
          ].join(' ')}
        />
      </Field>

      {/* Fila 2 */}
      <Field label="DNI *" id="dni" error={errors.dni}>
        <input
          id="dni"
          type="text"
          value={data.dni}
          onChange={(e) => onChange({ dni: e.target.value })}
          maxLength={8}
          className={[
            'w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30',
            errors.dni ? 'border-red-400' : 'border-gray-200',
          ].join(' ')}
        />
      </Field>

      <Field label="Fecha de Nacimiento *" id="fechaNacimiento" error={errors.fechaNacimiento}>
        <input
          id="fechaNacimiento"
          type="date"
          value={data.fechaNacimiento}
          onChange={(e) => onChange({ fechaNacimiento: e.target.value })}
          className={[
            'w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30',
            errors.fechaNacimiento ? 'border-red-400' : 'border-gray-200',
          ].join(' ')}
        />
      </Field>

      {/* Fila 3 */}
      <Field label="Género" id="genero">
        <EnumSelect
          id="genero"
          value={data.genero ?? ''}
          onChange={(v) => onChange({ genero: v || undefined })}
          options={GENERO_LABELS}
          placeholder="Seleccionar género..."
        />
      </Field>

      <Field label="Nacionalidad" id="nacionalidad">
        <input
          id="nacionalidad"
          type="text"
          value={data.nacionalidad ?? ''}
          onChange={(e) => onChange({ nacionalidad: e.target.value })}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
        />
      </Field>

      {/* Fila 4 */}
      <Field label="Teléfono" id="telefono">
        <input
          id="telefono"
          type="tel"
          value={data.telefono ?? ''}
          onChange={(e) => onChange({ telefono: e.target.value })}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
        />
      </Field>

      <Field label="Email" id="email">
        <input
          id="email"
          type="email"
          value={data.email ?? ''}
          onChange={(e) => onChange({ email: e.target.value })}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
        />
      </Field>

      {/* Fila 5 */}
      <Field label="Domicilio actual" id="domicilioActual" className="sm:col-span-2">
        <input
          id="domicilioActual"
          type="text"
          value={data.domicilioActual ?? ''}
          onChange={(e) => onChange({ domicilioActual: e.target.value })}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
        />
      </Field>

      {/* Fila 6 */}
      <Field label="Provincia" id="provincia">
        <input
          id="provincia"
          type="text"
          value={data.provincia ?? ''}
          onChange={(e) => onChange({ provincia: e.target.value })}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
        />
      </Field>

      <Field label="Ciudad" id="ciudad">
        <input
          id="ciudad"
          type="text"
          value={data.ciudad ?? ''}
          onChange={(e) => onChange({ ciudad: e.target.value })}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
        />
      </Field>

      {/* Fila 7 */}
      <Field label="Contacto de emergencia" id="contactoEmergencia" className="sm:col-span-2">
        <input
          id="contactoEmergencia"
          type="text"
          value={data.contactoEmergencia ?? ''}
          onChange={(e) => onChange({ contactoEmergencia: e.target.value })}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
          placeholder="Nombre y teléfono"
        />
      </Field>

      {/* Fila 8: Checkboxes */}
      <div className="sm:col-span-2 flex flex-wrap gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            id="vivePensionClub"
            type="checkbox"
            checked={data.vivePensionClub}
            onChange={(e) => onChange({ vivePensionClub: e.target.checked })}
            className="w-4 h-4 text-[#121A61] rounded border-gray-300 focus:ring-[#3346CC]/30"
          />
          <span className="text-sm text-[#1C1C1C]">Vive en pensión del club</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            id="vivePensionExterna"
            type="checkbox"
            checked={data.vivePensionExterna}
            onChange={(e) => onChange({ vivePensionExterna: e.target.checked })}
            className="w-4 h-4 text-[#121A61] rounded border-gray-300 focus:ring-[#3346CC]/30"
          />
          <span className="text-sm text-[#1C1C1C]">Vive en pensión externa</span>
        </label>
      </div>

      {/* Fila 9 */}
      <Field label="Observaciones" id="observaciones" className="sm:col-span-2">
        <textarea
          id="observaciones"
          value={data.observaciones ?? ''}
          onChange={(e) => onChange({ observaciones: e.target.value })}
          rows={3}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30 resize-none"
        />
      </Field>
    </div>
  );
}
