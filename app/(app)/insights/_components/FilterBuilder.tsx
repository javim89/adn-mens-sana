'use client';

import { Plus, Trash2 } from 'lucide-react';
import { CustomSelect } from '@/app/components/ui/custom-select';
import {
  OPERATORS_BY_TYPE,
  OPERATOR_LABELS,
  VALUELESS_OPERATORS,
  type ClientDataset,
  type ClientDimension,
} from '@/lib/insights/catalog-client';
import { isFilterGroup } from '@/lib/insights/types';
import type { FilterCondition, FilterGroup, Operator } from '@/lib/insights/types';

interface Props {
  dataset: ClientDataset;
  value: FilterGroup;
  onChange: (next: FilterGroup) => void;
  /** Profundidad actual, para limitar el anidamiento y sangrar. */
  depth?: number;
}

const MAX_DEPTH = 3;

export function emptyGroup(op: 'all' | 'any' = 'all'): FilterGroup {
  return { op, children: [] };
}

function defaultCondition(dataset: ClientDataset): FilterCondition | null {
  const dim = dataset.dimensions.find((d) => d.filterable);
  if (!dim) return null;
  return { field: dim.id, operator: OPERATORS_BY_TYPE[dim.type][0], value: '' };
}

/** Campo de valor según el operador: lista, rango, número o texto. */
function ValueInput({
  dimension,
  condition,
  onChange,
}: {
  dimension: ClientDimension;
  condition: FilterCondition;
  onChange: (value: unknown) => void;
}) {
  const { operator } = condition;

  if (VALUELESS_OPERATORS.includes(operator)) return null;

  // Enum con multi-selección: chips marcables, sin escribir a mano.
  if ((operator === 'in' || operator === 'not_in') && dimension.enumLabels) {
    const selected = Array.isArray(condition.value) ? (condition.value as string[]) : [];
    return (
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(dimension.enumLabels).map(([raw, label]) => {
          const active = selected.includes(raw);
          return (
            <button
              key={raw}
              type="button"
              aria-pressed={active}
              onClick={() =>
                onChange(active ? selected.filter((v) => v !== raw) : [...selected, raw])
              }
              className={`px-2 py-1 rounded-full text-xs border transition-colors ${
                active
                  ? 'bg-[#121A61] text-white border-[#121A61]'
                  : 'bg-white text-[#6B7280] border-gray-200 hover:border-[#3346CC]'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  }

  if (operator === 'between') {
    const pair = Array.isArray(condition.value) ? condition.value : ['', ''];
    const inputType = dimension.type === 'date' ? 'date' : 'number';
    return (
      <div className="flex items-center gap-2">
        <input
          type={inputType}
          value={String(pair[0] ?? '')}
          onChange={(e) => onChange([e.target.value, pair[1] ?? ''])}
          aria-label="Desde"
          className="h-9 w-full rounded-md border border-gray-200 px-2 text-sm"
        />
        <span className="text-xs text-[#6B7280]">y</span>
        <input
          type={inputType}
          value={String(pair[1] ?? '')}
          onChange={(e) => onChange([pair[0] ?? '', e.target.value])}
          aria-label="Hasta"
          className="h-9 w-full rounded-md border border-gray-200 px-2 text-sm"
        />
      </div>
    );
  }

  if (operator === 'last_n_days') {
    return (
      <input
        type="number"
        min={1}
        value={String(condition.value ?? '')}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Cantidad de días"
        className="h-9 w-full rounded-md border border-gray-200 px-2 text-sm"
      />
    );
  }

  // Enum con un solo valor: desplegable en vez de texto libre.
  if (dimension.enumLabels) {
    return (
      <CustomSelect
        value={String(condition.value ?? '')}
        onChange={onChange}
        options={Object.entries(dimension.enumLabels).map(([value, label]) => ({
          value,
          label,
        }))}
        placeholder="Elegir valor…"
      />
    );
  }

  return (
    <input
      type={dimension.type === 'number' ? 'number' : dimension.type === 'date' ? 'date' : 'text'}
      value={String(condition.value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Valor"
      placeholder="Valor"
      className="h-9 w-full rounded-md border border-gray-200 px-2 text-sm"
    />
  );
}

function ConditionRow({
  dataset,
  condition,
  onChange,
  onRemove,
}: {
  dataset: ClientDataset;
  condition: FilterCondition;
  onChange: (next: FilterCondition) => void;
  onRemove: () => void;
}) {
  const dimension =
    dataset.dimensions.find((d) => d.id === condition.field) ?? dataset.dimensions[0];

  const operators = OPERATORS_BY_TYPE[dimension.type];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start">
      <CustomSelect
        value={condition.field}
        searchable
        onChange={(field) => {
          const next = dataset.dimensions.find((d) => d.id === field);
          if (!next) return;
          // Al cambiar de campo el operador anterior puede no aplicar al tipo
          // nuevo; se cae al primero válido y se limpia el valor.
          const operator = OPERATORS_BY_TYPE[next.type].includes(condition.operator)
            ? condition.operator
            : OPERATORS_BY_TYPE[next.type][0];
          onChange({ field, operator, value: '' });
        }}
        options={dataset.dimensions
          .filter((d) => d.filterable)
          .map((d) => ({ value: d.id, label: d.label }))}
      />
      <CustomSelect
        value={condition.operator}
        onChange={(op) => onChange({ ...condition, operator: op as Operator, value: '' })}
        options={operators.map((op) => ({ value: op, label: OPERATOR_LABELS[op] }))}
      />
      <ValueInput
        dimension={dimension}
        condition={condition}
        onChange={(value) => onChange({ ...condition, value })}
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Quitar filtro"
        className="h-9 w-9 flex items-center justify-center rounded-md text-[#6B7280] hover:text-red-600 hover:bg-red-50"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

/**
 * Editor de grupos de filtros anidados (todos / cualquiera).
 *
 * Es recursivo: un grupo contiene condiciones y otros grupos. Se limita a
 * `MAX_DEPTH` niveles porque más allá de eso la UI deja de ser legible (el
 * compilador admite hasta 10, así que el tope acá es de usabilidad, no técnico).
 */
export default function FilterBuilder({ dataset, value, onChange, depth = 0 }: Props) {
  const setChild = (index: number, child: FilterGroup | FilterCondition) => {
    const children = [...value.children];
    children[index] = child;
    onChange({ ...value, children });
  };

  const removeChild = (index: number) => {
    onChange({ ...value, children: value.children.filter((_, i) => i !== index) });
  };

  return (
    <div
      className={
        depth > 0 ? 'border-l-2 border-gray-100 pl-3 space-y-2' : 'space-y-2'
      }
    >
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#6B7280]">Cumplir</span>
        <div className="inline-flex rounded-md border border-gray-200 overflow-hidden">
          {(['all', 'any'] as const).map((op) => (
            <button
              key={op}
              type="button"
              aria-pressed={value.op === op}
              onClick={() => onChange({ ...value, op })}
              className={`px-2.5 py-1 text-xs transition-colors ${
                value.op === op ? 'bg-[#121A61] text-white' : 'bg-white text-[#6B7280]'
              }`}
            >
              {op === 'all' ? 'todas' : 'alguna'}
            </button>
          ))}
        </div>
        <span className="text-xs text-[#6B7280]">de las condiciones</span>
      </div>

      {value.children.length === 0 && (
        <p className="text-xs text-[#6B7280] italic">Sin filtros — se incluye todo.</p>
      )}

      {value.children.map((child, i) =>
        isFilterGroup(child) ? (
          <FilterBuilder
            key={i}
            dataset={dataset}
            value={child}
            depth={depth + 1}
            onChange={(next) => setChild(i, next)}
          />
        ) : (
          <ConditionRow
            key={i}
            dataset={dataset}
            condition={child}
            onChange={(next) => setChild(i, next)}
            onRemove={() => removeChild(i)}
          />
        ),
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            const cond = defaultCondition(dataset);
            if (cond) onChange({ ...value, children: [...value.children, cond] });
          }}
          className="inline-flex items-center gap-1 text-xs text-[#3346CC] hover:underline"
        >
          <Plus size={13} /> Agregar condición
        </button>
        {depth < MAX_DEPTH && (
          <button
            type="button"
            onClick={() =>
              onChange({
                ...value,
                children: [...value.children, emptyGroup(value.op === 'all' ? 'any' : 'all')],
              })
            }
            className="inline-flex items-center gap-1 text-xs text-[#6B7280] hover:underline"
          >
            <Plus size={13} /> Agregar grupo
          </button>
        )}
      </div>
    </div>
  );
}
