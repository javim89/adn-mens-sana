'use client';

import { Pencil, Trash2, X } from 'lucide-react';
import { FiltroChip, type OpcionFiltro } from '@/app/components/ui/filtro-chip';
import { Input } from '@/app/components/ui/input';
import {
  OPERATOR_LABELS,
  VALUELESS_OPERATORS,
  getClientDataset,
} from '@/lib/insights/catalog-client';
import type { Operator } from '@/lib/insights/types';
import type { DashboardFilter } from '@/lib/actions/insights';

export interface CategoriaFiltro {
  id: string;
  nombre: string;
}

interface Props {
  filtros: DashboardFilter[];
  /** Valor elegido por filtro. Ausente = usa el valor por defecto. */
  valores: Record<string, unknown>;
  onChange: (filterId: string, value: unknown) => void;
  /** Catálogo de categorías del club: opciones del chip de los filtros por categoría. */
  categorias?: CategoriaFiltro[];
  editable?: boolean;
  onEdit?: (filtro: DashboardFilter) => void;
  onDelete?: (filtro: DashboardFilter) => void;
}

/** Rangos del chip de fecha (`last_n_days`). */
export const RANGOS_DIAS: OpcionFiltro[] = [
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '84', label: 'Últimas 12 semanas' },
  { value: '90', label: 'Últimos 90 días' },
  { value: '365', label: 'Último año' },
];

const MULTIPLES: Operator[] = ['in', 'not_in'];

/** Un filtro `in` guardado desde el diálogo puede venir como texto suelto o separado por comas. */
function aLista(valor: unknown): string[] {
  if (Array.isArray(valor)) return valor.map(String);
  if (valor === null || valor === undefined || valor === '') return [];
  return String(valor)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function aTexto(valor: unknown): string | null {
  if (valor === null || valor === undefined || valor === '') return null;
  return String(valor);
}

/**
 * Barra de filtros del dashboard en forma de chips (`FiltroChip`), uno por filtro:
 * - fecha con "en los últimos N días" → chip de rango;
 * - enums y la categoría (con el catálogo del club) → chip simple, o múltiple con
 *   `in`/`not_in`;
 * - el resto (texto/número/fecha libre) → input compacto.
 */
export default function DashboardFilterBar({
  filtros,
  valores,
  onChange,
  categorias,
  editable = false,
  onEdit,
  onDelete,
}: Props) {
  if (filtros.length === 0) return null;

  return (
    <div role="group" aria-label="Filtros del dashboard" className="mb-5 flex flex-wrap items-center gap-2">
      {filtros.map((filtro) => {
        const dataset = getClientDataset(filtro.dataset);
        const dimension = dataset?.dimensions.find((d) => d.id === filtro.dimension);
        const valor = filtro.id in valores ? valores[filtro.id] : filtro.valorDefault;
        const operator = filtro.operator as Operator;
        const sinValor = VALUELESS_OPERATORS.includes(operator);

        const opciones: OpcionFiltro[] | null = dimension?.enumLabels
          ? Object.entries(dimension.enumLabels).map(([value, label]) => ({ value, label }))
          : dimension?.id === 'categoria' && categorias?.length
            ? categorias.map((c) => ({ value: c.nombre, label: c.nombre }))
            : null;

        let control;
        if (sinValor) {
          control = (
            <span className="inline-flex h-9 items-center rounded-full border border-primario/30 bg-primario-suave px-3.5 text-sm font-medium text-primario">
              {filtro.label}: {OPERATOR_LABELS[operator] ?? filtro.operator}
            </span>
          );
        } else if (operator === 'last_n_days') {
          const actual = aTexto(valor);
          const rangos =
            actual && !RANGOS_DIAS.some((r) => r.value === actual)
              ? [...RANGOS_DIAS, { value: actual, label: `Últimos ${actual} días` }]
              : RANGOS_DIAS;
          control = (
            <FiltroChip
              label={filtro.label}
              todosLabel="Todo el período"
              opciones={rangos}
              valor={actual}
              onChange={(v) => onChange(filtro.id, v === null ? null : Number(v))}
            />
          );
        } else if (opciones && MULTIPLES.includes(operator)) {
          control = (
            <FiltroChip
              modo="multiple"
              label={filtro.label}
              opciones={opciones}
              valor={aLista(valor)}
              onChange={(v) => onChange(filtro.id, v)}
              buscar={opciones.length > 8}
            />
          );
        } else if (opciones) {
          control = (
            <FiltroChip
              label={filtro.label}
              opciones={opciones}
              valor={aTexto(valor)}
              onChange={(v) => onChange(filtro.id, v ?? '')}
              buscar={opciones.length > 8}
            />
          );
        } else {
          control = (
            <span className="relative inline-flex">
              <Input
                id={`filtro-${filtro.id}`}
                aria-label={`${filtro.label} (${OPERATOR_LABELS[operator] ?? filtro.operator})`}
                type={
                  dimension?.type === 'number' ? 'number' : dimension?.type === 'date' ? 'date' : 'text'
                }
                value={String(valor ?? '')}
                onChange={(e) => onChange(filtro.id, e.target.value)}
                placeholder={filtro.label}
                className="h-9 w-44 rounded-full bg-background pr-8"
              />
              {valor !== '' && valor !== undefined && valor !== null && (
                <button
                  type="button"
                  onClick={() => onChange(filtro.id, '')}
                  aria-label={`Limpiar ${filtro.label}`}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X size={13} />
                </button>
              )}
            </span>
          );
        }

        return (
          <div key={filtro.id} className="flex min-w-0 items-center gap-1">
            {control}
            {editable && (
              <span className="flex items-center">
                <button
                  type="button"
                  onClick={() => onEdit?.(filtro)}
                  aria-label={`Editar filtro ${filtro.label}`}
                  className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-primario"
                >
                  <Pencil size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete?.(filtro)}
                  aria-label={`Eliminar filtro ${filtro.label}`}
                  className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-red-600"
                >
                  <Trash2 size={12} />
                </button>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
