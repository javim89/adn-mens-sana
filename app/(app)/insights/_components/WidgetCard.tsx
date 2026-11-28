'use client';

import { useMemo } from 'react';
import {
  Copy,
  Download,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  applyDashboardFilters,
  type ActiveDashboardFilter,
} from '@/lib/insights/apply-filters';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Button } from '@/app/components/ui/button';
import { downloadCsv } from '@/lib/insights/export-csv';
import type { DashboardWidget } from '@/lib/actions/insights';
import type { InsightsSpec } from '@/lib/insights/types';
import WidgetRenderer from './WidgetRenderer';
import { useWidgetData } from './useWidgetData';
import { resumenSerie, specPeriodoAnterior } from './widget-resumen';
import { resolveSeriesColumns, toNumber } from './charts/helpers';
import type { VizConfig } from './charts/types';

const TIPOS_CON_RESUMEN = new Set(['line', 'area']);

interface Props {
  widget: DashboardWidget;
  editable?: boolean;
  /** Filtros de dashboard activos, ya resueltos a valores concretos. */
  filtros?: ActiveDashboardFilter[];
  onEdit?: (widget: DashboardWidget) => void;
  onDuplicate?: (widget: DashboardWidget) => void;
  onDelete?: (widget: DashboardWidget) => void;
}

export default function WidgetCard({
  widget,
  editable = false,
  filtros,
  onEdit,
  onDuplicate,
  onDelete,
}: Props) {
  // Los filtros del dashboard se inyectan en el spec antes de consultar; como
  // forman parte de la queryKey, cambiar un filtro redispara solo los widgets
  // que ese filtro afecta.
  const spec = useMemo(
    () => (filtros?.length ? applyDashboardFilters(widget.querySpec, widget.id, filtros) : widget.querySpec),
    [widget.querySpec, widget.id, filtros],
  );

  const { data, columns, isLoading, error } = useWidgetData(spec);

  // `vizConfig` se persiste como JSON, así que vuelve tipado como
  // `Record<string, unknown>`. Lo valida el server action con Zod antes de
  // guardarlo, y `WidgetRenderer` tolera un `type` desconocido.
  const config = widget.vizConfig as unknown as VizConfig;

  // KPI con variación: la misma consulta corrida sobre el período anterior.
  const specAnterior = useMemo<InsightsSpec | null>(
    () => (config.type === 'kpi' && config.compararPeriodo ? specPeriodoAnterior(spec) : null),
    [config.type, config.compararPeriodo, spec],
  );
  const anterior = useWidgetData(specAnterior ?? spec, specAnterior !== null);
  const kpiAnterior = (() => {
    if (!specAnterior) return undefined;
    const medida = resolveSeriesColumns(anterior.columns, config)[0];
    const fila = anterior.data[0];
    return medida && fila ? toNumber(fila[medida.id]) : null;
  })();

  const resumen =
    !isLoading && !error && TIPOS_CON_RESUMEN.has(config.type)
      ? resumenSerie(
          data,
          columns,
          config,
          spec.mode === 'builder' ? spec.timeGrain : undefined,
        )
      : null;

  return (
    <div className="h-full w-full flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/*
        El header es el asa de arrastre (`widget-drag-handle`). Si el asa fuera
        la card entera, no se podría hacer scroll dentro de una tabla ni tocar
        un punto del gráfico sin mover el widget.
      */}
      <div className="widget-drag-handle flex items-start justify-between gap-2 px-4 pt-3 pb-2 shrink-0">
        <div className="min-w-0">
          <h3
            className="font-[family-name:var(--font-oswald)] text-sm font-semibold text-primario truncate"
            title={widget.titulo}
          >
            {widget.titulo}
          </h3>
          {widget.descripcion && (
            <p className="text-xs text-muted-foreground truncate" title={widget.descripcion}>
              {widget.descripcion}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 px-2 text-[11px]"
            disabled={data.length === 0}
            aria-label={`Exportar CSV de ${widget.titulo}`}
            // `onMouseDown` detenido: sin esto, tocar el botón arrastra el widget.
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => downloadCsv(widget.titulo, data, columns)}
          >
            <Download aria-hidden className="size-3" />
            CSV
          </Button>

          {editable && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Acciones de ${widget.titulo}`}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                >
                  <MoreHorizontal size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onEdit?.(widget)}>
                  <Pencil size={14} /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate?.(widget)}>
                  <Copy size={14} /> Duplicar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete?.(widget)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 size={14} /> Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* `min-h-0` es lo que permite que recharts mida su alto real dentro del flex. */}
      <div className="flex-1 min-h-0 px-3 pb-3">
        <WidgetRenderer
          data={data}
          columns={columns}
          config={config}
          isLoading={isLoading}
          error={error}
          kpiAnterior={kpiAnterior}
        />
      </div>

      {resumen && (
        <dl className="grid shrink-0 grid-cols-3 gap-2 px-3 pb-3">
          {[
            { label: 'Promedio', valor: resumen.promedio },
            { label: resumen.mejorLabel, valor: resumen.mejor },
            { label: 'Variación', valor: resumen.variacion },
          ].map((s) => (
            <div key={s.label} className="min-w-0 rounded-lg border border-border bg-subtle px-2.5 py-1.5">
              <dt className="truncate text-[11px] text-muted-foreground">{s.label}</dt>
              <dd className="truncate font-[family-name:var(--font-oswald)] text-base font-semibold tabular-nums text-primario">
                {s.valor}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
