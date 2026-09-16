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
import { downloadCsv } from '@/lib/insights/export-csv';
import type { DashboardWidget } from '@/lib/actions/insights';
import WidgetRenderer from './WidgetRenderer';
import { useWidgetData } from './useWidgetData';
import type { VizConfig } from './charts/types';

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
            className="text-sm font-semibold text-[#121A61] truncate"
            style={{ fontFamily: 'Oswald, sans-serif' }}
            title={widget.titulo}
          >
            {widget.titulo}
          </h3>
          {widget.descripcion && (
            <p className="text-xs text-[#6B7280] truncate" title={widget.descripcion}>
              {widget.descripcion}
            </p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Acciones de ${widget.titulo}`}
              // `onMouseDown` detenido: sin esto, abrir el menú arrastra el widget.
              onMouseDown={(e) => e.stopPropagation()}
              className="shrink-0 h-7 w-7 flex items-center justify-center rounded-md text-[#6B7280] opacity-0 group-hover/widget:opacity-100 focus:opacity-100 hover:bg-[#F3F4F6] transition-opacity"
            >
              <MoreHorizontal size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {editable && (
              <>
                <DropdownMenuItem onClick={() => onEdit?.(widget)}>
                  <Pencil size={14} /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate?.(widget)}>
                  <Copy size={14} /> Duplicar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              disabled={data.length === 0}
              onClick={() => downloadCsv(widget.titulo, data, columns)}
            >
              <Download size={14} /> Exportar CSV
            </DropdownMenuItem>
            {editable && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete?.(widget)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 size={14} /> Eliminar
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* `min-h-0` es lo que permite que recharts mida su alto real dentro del flex. */}
      <div className="flex-1 min-h-0 px-3 pb-3">
        <WidgetRenderer
          data={data}
          columns={columns}
          // `vizConfig` se persiste como JSON, así que vuelve tipado como
          // `Record<string, unknown>`. Lo valida el server action con Zod antes
          // de guardarlo, y `WidgetRenderer` tolera un `type` desconocido.
          config={widget.vizConfig as unknown as VizConfig}
          isLoading={isLoading}
          error={error}
        />
      </div>
    </div>
  );
}
