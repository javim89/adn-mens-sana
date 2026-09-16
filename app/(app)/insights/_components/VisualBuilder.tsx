'use client';

import { CustomSelect } from '@/app/components/ui/custom-select';
import {
  CLIENT_DATASETS,
  TIME_GRAIN_LABELS,
  getClientDataset,
} from '@/lib/insights/catalog-client';
import { MAX_DIMENSIONS, MAX_LIMIT } from '@/lib/insights/types';
import type { QuerySpec, TimeGrain } from '@/lib/insights/types';
import FilterBuilder, { emptyGroup } from './FilterBuilder';

interface Props {
  spec: QuerySpec;
  onChange: (next: QuerySpec) => void;
}

/**
 * Constructor visual: Dataset → Dimensiones → Medidas → Filtros → Orden/Límite.
 *
 * Toda edición se hace sobre ids del catálogo; este componente nunca arma SQL.
 * Cuando cambia el dataset se descartan dimensiones, medidas, filtros y orden,
 * porque ninguno de esos ids existe necesariamente en el dataset nuevo y el
 * compilador los rechazaría.
 */
export default function VisualBuilder({ spec, onChange }: Props) {
  const dataset = getClientDataset(spec.dataset);

  const patch = (partial: Partial<QuerySpec>) => onChange({ ...spec, ...partial });

  const handleDatasetChange = (id: string) => {
    onChange({
      mode: 'builder',
      dataset: id,
      dimensions: [],
      measures: [],
      limit: spec.limit,
    });
  };

  const toggleDimension = (id: string) => {
    const active = spec.dimensions.includes(id);
    if (!active && spec.dimensions.length >= MAX_DIMENSIONS) return;

    const dimensions = active
      ? spec.dimensions.filter((d) => d !== id)
      : [...spec.dimensions, id];

    // Quitar una dimensión invalida el orden y el grano temporal que la usaban.
    const next: Partial<QuerySpec> = { dimensions };
    if (active) {
      next.sort = spec.sort?.filter((s) => s.field !== id);
      if (spec.timeDimension === id) {
        next.timeDimension = undefined;
        next.timeGrain = undefined;
      }
    }
    patch(next);
  };

  const toggleMeasure = (id: string) => {
    const active = spec.measures.includes(id);
    patch({
      measures: active ? spec.measures.filter((m) => m !== id) : [...spec.measures, id],
      ...(active ? { sort: spec.sort?.filter((s) => s.field !== id) } : {}),
    });
  };

  const dateDimensions = (dataset?.dimensions ?? []).filter(
    (d) => d.type === 'date' && spec.dimensions.includes(d.id),
  );

  const sortable = [
    ...spec.dimensions.map((id) => ({
      value: id,
      label: dataset?.dimensions.find((d) => d.id === id)?.label ?? id,
    })),
    ...spec.measures.map((id) => ({
      value: id,
      label: dataset?.measures.find((m) => m.id === id)?.label ?? id,
    })),
  ];

  const currentSort = spec.sort?.[0];

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">Dataset</label>
        <CustomSelect
          value={spec.dataset}
          onChange={handleDatasetChange}
          searchable
          options={CLIENT_DATASETS.map((d) => ({ value: d.id, label: d.label }))}
          placeholder="Elegir dataset…"
        />
        {dataset && (
          <p className="mt-1.5 text-xs text-[#6B7280]">
            {dataset.description} <span className="text-gray-400">·</span> {dataset.grain}
          </p>
        )}
      </div>

      {dataset && (
        <>
          <section>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-sm font-medium text-[#1C1C1C]">Dimensiones</h3>
              <span className="text-xs text-[#6B7280]">
                {spec.dimensions.length}/{MAX_DIMENSIONS}
              </span>
            </div>
            <p className="text-xs text-[#6B7280] mb-2">Campos por los que se agrupa.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 max-h-56 overflow-y-auto pr-1">
              {dataset.dimensions.map((dim) => {
                const checked = spec.dimensions.includes(dim.id);
                const atLimit = !checked && spec.dimensions.length >= MAX_DIMENSIONS;
                return (
                  <label
                    key={dim.id}
                    className={`flex items-center gap-2 text-sm ${
                      atLimit ? 'text-gray-300 cursor-not-allowed' : 'text-[#1C1C1C] cursor-pointer'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={atLimit}
                      onChange={() => toggleDimension(dim.id)}
                      className="rounded border-gray-300 text-[#121A61] focus:ring-[#3346CC]"
                    />
                    {dim.label}
                  </label>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-medium text-[#1C1C1C] mb-2">Medidas</h3>
            <p className="text-xs text-[#6B7280] mb-2">Qué se calcula para cada grupo.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 max-h-56 overflow-y-auto pr-1">
              {dataset.measures.map((measure) => (
                <label
                  key={measure.id}
                  className="flex items-center gap-2 text-sm text-[#1C1C1C] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={spec.measures.includes(measure.id)}
                    onChange={() => toggleMeasure(measure.id)}
                    className="rounded border-gray-300 text-[#121A61] focus:ring-[#3346CC]"
                  />
                  <span>{measure.label}</span>
                  {measure.isFormula && (
                    <span className="px-1.5 py-0.5 rounded-full bg-[#F3F4F6] text-[10px] text-[#6B7280]">
                      Fórmula
                    </span>
                  )}
                </label>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-medium text-[#1C1C1C] mb-2">Filtros</h3>
            <FilterBuilder
              dataset={dataset}
              value={spec.filters ?? emptyGroup()}
              onChange={(filters) =>
                patch({ filters: filters.children.length > 0 ? filters : undefined })
              }
            />
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
                Agrupar fecha por
              </label>
              <CustomSelect
                value={spec.timeGrain ?? ''}
                disabled={dateDimensions.length === 0}
                onChange={(grain) =>
                  patch(
                    grain
                      ? {
                          timeGrain: grain as TimeGrain,
                          timeDimension: spec.timeDimension ?? dateDimensions[0]?.id,
                        }
                      : { timeGrain: undefined, timeDimension: undefined },
                  )
                }
                options={[
                  { value: '', label: 'Sin agrupar' },
                  ...Object.entries(TIME_GRAIN_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  })),
                ]}
              />
              {dateDimensions.length === 0 && (
                <p className="mt-1 text-xs text-[#6B7280]">
                  Requiere una dimensión de fecha.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">Ordenar por</label>
              <CustomSelect
                value={currentSort?.field ?? ''}
                disabled={sortable.length === 0}
                onChange={(field) =>
                  patch({
                    sort: field
                      ? [{ field, direction: currentSort?.direction ?? 'desc' }]
                      : undefined,
                  })
                }
                options={[{ value: '', label: 'Sin orden' }, ...sortable]}
              />
              {currentSort && (
                <div className="mt-1.5 inline-flex rounded-md border border-gray-200 overflow-hidden">
                  {(['desc', 'asc'] as const).map((dir) => (
                    <button
                      key={dir}
                      type="button"
                      aria-pressed={currentSort.direction === dir}
                      onClick={() => patch({ sort: [{ ...currentSort, direction: dir }] })}
                      className={`px-2 py-1 text-xs ${
                        currentSort.direction === dir
                          ? 'bg-[#121A61] text-white'
                          : 'bg-white text-[#6B7280]'
                      }`}
                    >
                      {dir === 'desc' ? 'Mayor a menor' : 'Menor a mayor'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="viz-limit" className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
                Límite de filas
              </label>
              <input
                id="viz-limit"
                type="number"
                min={1}
                max={MAX_LIMIT}
                value={spec.limit ?? MAX_LIMIT}
                onChange={(e) => patch({ limit: Number(e.target.value) })}
                className="h-9 w-full rounded-md border border-gray-200 px-2 text-sm"
              />
              <p className="mt-1 text-xs text-[#6B7280]">Máximo {MAX_LIMIT}.</p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
