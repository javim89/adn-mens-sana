'use client';

import { useMemo, useState } from 'react';
import { Filter } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { CustomSelect } from '@/app/components/ui/custom-select';
import {
  CLIENT_DATASETS,
  OPERATORS_BY_TYPE,
  OPERATOR_LABELS,
  VALUELESS_OPERATORS,
  getClientDataset,
} from '@/lib/insights/catalog-client';
import type { Operator } from '@/lib/insights/types';
import type { DashboardFilter, DashboardWidget } from '@/lib/actions/insights';

export interface FilterDraft {
  id?: string;
  label: string;
  dataset: string;
  dimension: string;
  operator: Operator;
  valorDefault: unknown;
  widgetIds: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widgets: DashboardWidget[];
  filter?: DashboardFilter;
  onSave: (draft: FilterDraft) => void;
}

function emptyDraft(): FilterDraft {
  const dataset = CLIENT_DATASETS[0];
  const dimension = dataset.dimensions.find((d) => d.filterable)!;
  return {
    label: '',
    dataset: dataset.id,
    dimension: dimension.id,
    operator: OPERATORS_BY_TYPE[dimension.type][0],
    valorDefault: '',
    widgetIds: [],
  };
}

/**
 * "Agregar filtro de dashboard": un control único que afecta a varios widgets.
 *
 * La lista de widgets objetivo se recalcula sola según el dataset elegido, que
 * es el comportamiento de la referencia: un filtro solo puede apuntar a widgets
 * que consultan ese mismo dataset — sobre otro no tendría a qué aplicarse.
 */
export default function DashboardFilterDialog({
  open,
  onOpenChange,
  widgets,
  filter,
  onSave,
}: Props) {
  const [draft, setDraft] = useState<FilterDraft>(
    filter
      ? {
          id: filter.id,
          label: filter.label,
          dataset: filter.dataset,
          dimension: filter.dimension,
          operator: filter.operator as Operator,
          valorDefault: filter.valorDefault,
          widgetIds: filter.widgetIds,
        }
      : emptyDraft(),
  );

  const dataset = getClientDataset(draft.dataset);
  const dimension = dataset?.dimensions.find((d) => d.id === draft.dimension);

  // Solo los widgets del mismo dataset pueden recibir este filtro.
  const compatibles = useMemo(
    () =>
      widgets.filter(
        (w) => w.querySpec.mode === 'builder' && w.querySpec.dataset === draft.dataset,
      ),
    [widgets, draft.dataset],
  );

  const setDataset = (id: string) => {
    const next = getClientDataset(id);
    const dim = next?.dimensions.find((d) => d.filterable);
    if (!next || !dim) return;
    // Cambiar de dataset invalida la dimensión, el operador y los targets.
    setDraft((d) => ({
      ...d,
      dataset: id,
      dimension: dim.id,
      operator: OPERATORS_BY_TYPE[dim.type][0],
      valorDefault: '',
      widgetIds: [],
    }));
  };

  const setDimension = (id: string) => {
    const dim = dataset?.dimensions.find((d) => d.id === id);
    if (!dim) return;
    const operator = OPERATORS_BY_TYPE[dim.type].includes(draft.operator)
      ? draft.operator
      : OPERATORS_BY_TYPE[dim.type][0];
    setDraft((d) => ({ ...d, dimension: id, operator, valorDefault: '' }));
  };

  const toggleWidget = (id: string) =>
    setDraft((d) => ({
      ...d,
      widgetIds: d.widgetIds.includes(id)
        ? d.widgetIds.filter((w) => w !== id)
        : [...d.widgetIds, id],
    }));

  const necesitaValor = !VALUELESS_OPERATORS.includes(draft.operator);
  const puedeGuardar = draft.label.trim().length > 0 && draft.widgetIds.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'Oswald, sans-serif' }}>
            {filter ? 'Editar filtro' : 'Agregar filtro de dashboard'}
          </DialogTitle>
          <DialogDescription>
            Un control reutilizable que aplica a los widgets que elijas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label
              htmlFor="filtro-label"
              className="block text-sm font-medium text-[#1C1C1C] mb-1.5"
            >
              Etiqueta
            </label>
            <input
              id="filtro-label"
              value={draft.label}
              onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
              placeholder="Disciplina"
              className="h-9 w-full rounded-md border border-gray-200 px-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">Dataset</label>
            <CustomSelect
              value={draft.dataset}
              onChange={setDataset}
              searchable
              options={CLIENT_DATASETS.map((d) => ({ value: d.id, label: d.label }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">Campo</label>
              <CustomSelect
                value={draft.dimension}
                onChange={setDimension}
                searchable
                options={(dataset?.dimensions ?? [])
                  .filter((d) => d.filterable)
                  .map((d) => ({ value: d.id, label: d.label }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">Operador</label>
              <CustomSelect
                value={draft.operator}
                onChange={(op) =>
                  setDraft((d) => ({ ...d, operator: op as Operator, valorDefault: '' }))
                }
                options={(dimension ? OPERATORS_BY_TYPE[dimension.type] : []).map((op) => ({
                  value: op,
                  label: OPERATOR_LABELS[op],
                }))}
              />
            </div>
          </div>

          {necesitaValor && (
            <div>
              <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
                Valor por defecto{' '}
                <span className="text-[#6B7280] font-normal">(opcional)</span>
              </label>
              {dimension?.enumLabels ? (
                <CustomSelect
                  value={String(draft.valorDefault ?? '')}
                  onChange={(v) => setDraft((d) => ({ ...d, valorDefault: v }))}
                  options={[
                    { value: '', label: 'Sin valor' },
                    ...Object.entries(dimension.enumLabels).map(([value, label]) => ({
                      value,
                      label,
                    })),
                  ]}
                />
              ) : (
                <input
                  type={dimension?.type === 'number' ? 'number' : dimension?.type === 'date' ? 'date' : 'text'}
                  value={String(draft.valorDefault ?? '')}
                  onChange={(e) => setDraft((d) => ({ ...d, valorDefault: e.target.value }))}
                  className="h-9 w-full rounded-md border border-gray-200 px-2 text-sm"
                />
              )}
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-[#1C1C1C]">Widgets afectados</p>
            <p className="text-xs text-[#6B7280] mb-2">
              La lista se actualiza según el dataset elegido.
            </p>

            {compatibles.length === 0 ? (
              <p className="text-xs text-[#6B7280] italic rounded-md bg-[#F3F4F6] px-3 py-2">
                Ningún widget de este dashboard consulta ese dataset.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 rounded-md border border-gray-100 p-3 max-h-40 overflow-y-auto">
                {compatibles.map((w) => (
                  <label
                    key={w.id}
                    className="flex items-center gap-2 text-sm text-[#1C1C1C] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={draft.widgetIds.includes(w.id)}
                      onChange={() => toggleWidget(w.id)}
                      className="rounded border-gray-300 text-[#121A61] focus:ring-[#3346CC]"
                    />
                    <span className="truncate">{w.titulo}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm text-[#6B7280] hover:text-[#1C1C1C]"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!puedeGuardar}
            onClick={() => {
              onSave(draft);
              onOpenChange(false);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#121A61] text-white text-sm hover:bg-[#1E2A8A] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Filter size={15} /> {filter ? 'Guardar' : 'Agregar filtro'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
