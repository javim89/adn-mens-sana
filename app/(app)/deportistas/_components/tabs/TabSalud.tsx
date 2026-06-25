'use client';

import { useState, useRef, useEffect } from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import {
  ENFERMEDAD_PREEXISTENTE_LABELS,
  ANTECEDENTE_ENFERMEDAD_FAMILIAR_LABELS,
} from '@/lib/utils/enum-labels';
import type { DeportistaFormData } from '@/lib/types/deportistas';

interface TabSaludProps {
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

function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder = 'Seleccionar...',
}: {
  options: Record<string, string>;
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  }

  const label =
    selected.length === 0
      ? null
      : selected.length === 1
        ? options[selected[0]]
        : `${selected.length} seleccionadas`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
      >
        <span className={label ? 'text-[#1C1C1C]' : 'text-[#6B7280]'}>
          {label ?? placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`text-[#6B7280] transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {Object.entries(options).map(([value, optLabel]) => (
            <label
              key={value}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm text-[#1C1C1C]"
            >
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 accent-[#121A61]"
                checked={selected.includes(value)}
                onChange={() => toggle(value)}
              />
              <span className={selected.includes(value) ? 'font-medium' : ''}>
                {optLabel}
              </span>
            </label>
          ))}
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selected.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 text-xs bg-[#121A61]/10 text-[#121A61] px-2 py-0.5 rounded-full"
            >
              {options[v]}
              <button type="button" onClick={() => toggle(v)} className="hover:text-red-500">
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TabSalud({ data, onChange }: TabSaludProps) {
  const sal = data.datosSalud ?? {
    enfermedadesPreexistentes: [],
    antecedentesEnfermedadesFam: [],
  };

  function patchSal(patch: Partial<NonNullable<DeportistaFormData['datosSalud']>>) {
    onChange({ datosSalud: { ...sal, ...patch } });
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
      {/* Fila 1: Grupo sanguíneo + Horas de sueño */}
      <Field label="Grupo y factor sanguíneo" id="grupoSanguineo">
        <input
          id="grupoSanguineo"
          type="text"
          value={sal.grupoSanguineo ?? ''}
          onChange={(e) => patchSal({ grupoSanguineo: e.target.value })}
          placeholder="Ej: 0+"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
        />
      </Field>

      <Field label="Horas de sueño promedio" id="horasSuenio">
        <input
          id="horasSuenio"
          type="text"
          value={sal.horasSuenio ?? ''}
          onChange={(e) => patchSal({ horasSuenio: e.target.value })}
          placeholder="Ej: 8-9 horas"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
        />
      </Field>

      {/* Fila 2: Obra social (ancho completo) */}
      <Field label="Obra social y nº de afiliado" id="obraSocial" className="sm:col-span-2">
        <input
          id="obraSocial"
          type="text"
          value={sal.obraSocial ?? ''}
          onChange={(e) => patchSal({ obraSocial: e.target.value })}
          placeholder="Ej: IOMA - A244990067/04"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
        />
      </Field>

      {/* Enfermedades preexistentes */}
      <Field label="Enfermedades preexistentes" id="enfermedadesPreexistentes" className="sm:col-span-2">
        <MultiSelectDropdown
          options={ENFERMEDAD_PREEXISTENTE_LABELS}
          selected={sal.enfermedadesPreexistentes ?? []}
          onChange={(values) =>
            patchSal({
              enfermedadesPreexistentes:
                values as NonNullable<DeportistaFormData['datosSalud']>['enfermedadesPreexistentes'],
            })
          }
          placeholder="Seleccionar enfermedades..."
        />
      </Field>

      {/* Antecedentes familiares */}
      <Field label="Antecedentes de enfermedades familiares" id="antecedentesEnfermedadesFam" className="sm:col-span-2">
        <MultiSelectDropdown
          options={ANTECEDENTE_ENFERMEDAD_FAMILIAR_LABELS}
          selected={sal.antecedentesEnfermedadesFam ?? []}
          onChange={(values) =>
            patchSal({
              antecedentesEnfermedadesFam:
                values as NonNullable<DeportistaFormData['datosSalud']>['antecedentesEnfermedadesFam'],
            })
          }
          placeholder="Seleccionar antecedentes familiares..."
        />
      </Field>

      {/* Alerta muerte súbita */}
      <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 sm:col-span-2">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-red-800">
              ¿Antecedente familiar de muerte súbita cardíaca o inexplicable en familiar de 1er grado antes de los 50 años?
            </p>
          </div>
          <div className="flex gap-2 sm:shrink-0">
            <button
              type="button"
              onClick={() => patchSal({ antecedenteMuerteSubitaFamiliar: true })}
              className={`px-4 py-1.5 text-sm rounded-full border transition-colors ${
                sal.antecedenteMuerteSubitaFamiliar === true
                  ? 'bg-red-500 border-red-500 text-white'
                  : 'border-red-300 text-red-700 hover:bg-red-100'
              }`}
            >
              Sí
            </button>
            <button
              type="button"
              onClick={() => patchSal({ antecedenteMuerteSubitaFamiliar: false })}
              className={`px-4 py-1.5 text-sm rounded-full border transition-colors ${
                sal.antecedenteMuerteSubitaFamiliar === false
                  ? 'bg-gray-600 border-gray-600 text-white'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              No
            </button>
          </div>
        </div>
      </div>

      {/* Antecedentes quirúrgicos */}
      <Field label="Antecedentes quirúrgicos" id="antecedentesQuirurgicos" className="sm:col-span-2">
        <textarea
          id="antecedentesQuirurgicos"
          value={sal.antecedentesQuirurgicos ?? ''}
          onChange={(e) => patchSal({ antecedentesQuirurgicos: e.target.value })}
          rows={3}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30 resize-y"
        />
      </Field>

      {/* Medicación / tratamientos crónicos */}
      <Field label="Medicación / tratamientos crónicos" id="medicacionCronica" className="sm:col-span-2">
        <textarea
          id="medicacionCronica"
          value={sal.medicacionCronica ?? ''}
          onChange={(e) => patchSal({ medicacionCronica: e.target.value })}
          rows={3}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30 resize-y"
        />
      </Field>

      {/* Historial de lesiones */}
      <Field label="Historial de lesiones" id="historialLesiones" className="sm:col-span-2">
        <textarea
          id="historialLesiones"
          value={sal.historialLesiones ?? ''}
          onChange={(e) => patchSal({ historialLesiones: e.target.value })}
          rows={3}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30 resize-y"
        />
      </Field>
    </div>
  );
}
