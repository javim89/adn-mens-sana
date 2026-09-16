'use client';

import { AlertCircle } from 'lucide-react';
import type { ColumnMeta, Row } from '@/lib/insights/types';
import type { VizConfig } from './charts/types';
import { ChartErrorBoundary } from './charts/ChartErrorBoundary';
import { ChartEmpty } from './charts/ChartChrome';
import AreaChart from './charts/AreaChart';
import BarChart from './charts/BarChart';
import ComparisonChart from './charts/ComparisonChart';
import ComposedChart from './charts/ComposedChart';
import DataTable from './charts/DataTable';
import DonutChart from './charts/DonutChart';
import GroupedBarChart from './charts/GroupedBarChart';
import KpiChart from './charts/KpiChart';
import LineChart from './charts/LineChart';
import PercentStackedBarChart from './charts/PercentStackedBarChart';
import PieChart from './charts/PieChart';
import ProgressChart from './charts/ProgressChart';
import StackedBarChart from './charts/StackedBarChart';

const REGISTRY = {
  kpi: KpiChart,
  comparison: ComparisonChart,
  progress: ProgressChart,
  line: LineChart,
  area: AreaChart,
  bar: BarChart,
  grouped_bar: GroupedBarChart,
  stacked_bar: StackedBarChart,
  percent_stacked_bar: PercentStackedBarChart,
  composed: ComposedChart,
  pie: PieChart,
  donut: DonutChart,
  table: DataTable,
} as const;

export interface WidgetRendererProps {
  data: Row[];
  columns: ColumnMeta[];
  config: VizConfig;
  isLoading?: boolean;
  error?: string | null;
}

function WidgetSkeleton() {
  return (
    <div className="h-full w-full flex flex-col justify-end gap-2 p-2" aria-busy="true">
      <span className="sr-only">Cargando…</span>
      {[60, 85, 45, 70].map((h, i) => (
        <div
          key={i}
          className="bg-gray-100 rounded animate-pulse w-full"
          style={{ height: `${h / 4}%` }}
        />
      ))}
    </div>
  );
}

function WidgetError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="h-full w-full flex flex-col items-center justify-center gap-1.5 px-4 text-center"
    >
      <AlertCircle size={18} className="text-red-500" />
      <p className="text-sm text-[#1C1C1C]">No se pudo cargar este widget</p>
      <p className="text-xs text-[#6B7280]">{message}</p>
    </div>
  );
}

/**
 * Elige el chart según `config.type` y resuelve los tres estados del widget.
 *
 * El orden importa: error antes que loading (un refetch fallido no debe volver
 * a mostrar el skeleton), y loading antes que empty (si no, mientras carga se
 * vería "sin datos" y parecería una respuesta vacía).
 */
export default function WidgetRenderer({
  data,
  columns,
  config,
  isLoading,
  error,
}: WidgetRendererProps) {
  if (error) return <WidgetError message={error} />;
  if (isLoading) return <WidgetSkeleton />;

  const Chart = REGISTRY[config.type as keyof typeof REGISTRY];
  if (!Chart) {
    return <WidgetError message={`Tipo de visualización desconocido: "${config.type}"`} />;
  }

  // La tabla sí tiene sentido con columnas y cero filas; el resto, no.
  if (data.length === 0 && config.type !== 'table') return <ChartEmpty />;

  return (
    <ChartErrorBoundary resetKey={`${config.type}:${columns.map((c) => c.id).join(',')}`}>
      <Chart data={data} config={config} columns={columns} />
    </ChartErrorBoundary>
  );
}
