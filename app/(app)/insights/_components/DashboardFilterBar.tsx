'use client';

import { Pencil, Trash2, X } from 'lucide-react';
import { CustomSelect } from '@/app/components/ui/custom-select';
import {
  OPERATOR_LABELS,
  VALUELESS_OPERATORS,
  getClientDataset,
} from '@/lib/insights/catalog-client';
import type { Operator } from '@/lib/insights/types';
import type { DashboardFilter } from '@/lib/actions/insights';

interface Props {
  filtros: DashboardFilter[];
  /** Valor elegido por filtro. Ausente = usa el valor por defecto. */
  valores: Record<string, unknown>;
  onChange: (filterId: string, value: unknown) => void;
  editable?: boolean;
  onEdit?: (filtro: DashboardFilter) => void;
  onDelete?: (filtro: DashboardFilter) => void;
}

/** Barra de controles que se aplican a los widgets objetivo de cada filtro. */
export default function DashboardFilterBar({
  filtros,
  valores,
  onChange,
  editable = false,
  onEdit,
  onDelete,
}: Props) {
  if (filtros.length === 0) return null;

  return (
    <div className="flex flex-wrap items-end gap-3 mb-5 bg-white rounded-xl border border-gray-100 px-4 py-3">
      {filtros.map((filtro) => {
        const dataset = getClientDataset(filtro.dataset);
        const dimension = dataset?.dimensions.find((d) => d.id === filtro.dimension);
        const valor = filtro.id in valores ? valores[filtro.id] : filtro.valorDefault;
        const sinValor = VALUELESS_OPERATORS.includes(filtro.operator as Operator);

        return (
          <div key={filtro.id} className="min-w-[180px]">
            <div className="flex items-center gap-1 mb-1">
              <label
                htmlFor={`filtro-${filtro.id}`}
                className="text-xs font-medium text-[#1C1C1C]"
              >
                {filtro.label}
              </label>
              <span className="text-xs text-[#6B7280]">
                {OPERATOR_LABELS[filtro.operator as Operator] ?? filtro.operator}
              </span>
              {editable && (
                <span className="flex items-center gap-0.5 ml-1">
                  <button
                    type="button"
                    onClick={() => onEdit?.(filtro)}
                    aria-label={`Editar filtro ${filtro.label}`}
                    className="text-[#6B7280] hover:text-[#121A61]"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete?.(filtro)}
                    aria-label={`Eliminar filtro ${filtro.label}`}
                    className="text-[#6B7280] hover:text-red-600"
                  >
                    <Trash2 size={12} />
                  </button>
                </span>
              )}
            </div>

            {sinValor ? (
              <p className="h-9 flex items-center text-sm text-[#6B7280]">
                Siempre activo
              </p>
            ) : dimension?.enumLabels ? (
              <CustomSelect
                id={`filtro-${filtro.id}`}
                value={String(valor ?? '')}
                onChange={(v) => onChange(filtro.id, v)}
                options={[
                  { value: '', label: 'Todos' },
                  ...Object.entries(dimension.enumLabels).map(([value, label]) => ({
                    value,
                    label,
                  })),
                ]}
              />
            ) : (
              <div className="relative">
                <input
                  id={`filtro-${filtro.id}`}
                  type={
                    dimension?.type === 'number'
                      ? 'number'
                      : dimension?.type === 'date'
                        ? 'date'
                        : 'text'
                  }
                  value={String(valor ?? '')}
                  onChange={(e) => onChange(filtro.id, e.target.value)}
                  placeholder="Todos"
                  className="h-9 w-full rounded-md border border-gray-200 px-2 pr-7 text-sm"
                />
                {valor !== '' && valor !== undefined && valor !== null && (
                  <button
                    type="button"
                    onClick={() => onChange(filtro.id, '')}
                    aria-label={`Limpiar ${filtro.label}`}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1C1C1C]"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
