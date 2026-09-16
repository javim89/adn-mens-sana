'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChartColumn, RefreshCw } from 'lucide-react';
import type { DashboardDetail } from '@/lib/actions/insights';
import type { ActiveDashboardFilter } from '@/lib/insights/apply-filters';
import DashboardGrid from './DashboardGrid';
import DashboardFilterBar from './DashboardFilterBar';

export default function DashboardView({ dashboard }: { dashboard: DashboardDetail }) {
  const queryClient = useQueryClient();
  const [lastRefresh, setLastRefresh] = useState<Date>(() => new Date());
  const [refreshing, setRefreshing] = useState(false);

  // Valor elegido por filtro. Un filtro ausente del mapa usa su valor por defecto.
  const [valores, setValores] = useState<Record<string, unknown>>({});

  const filtrosActivos = useMemo<ActiveDashboardFilter[]>(
    () =>
      dashboard.filtros.map((f) => ({
        id: f.id,
        dataset: f.dataset,
        dimension: f.dimension,
        operator: f.operator,
        value: f.id in valores ? valores[f.id] : f.valorDefault,
        widgetIds: f.widgetIds,
      })),
    [dashboard.filtros, valores],
  );

  const refresh = async () => {
    setRefreshing(true);
    // Todas las queries de widgets comparten el prefijo 'insights-query'.
    await queryClient.invalidateQueries({ queryKey: ['insights-query'] });
    setLastRefresh(new Date());
    setRefreshing(false);
  };

  if (dashboard.widgets.length === 0) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white px-6 py-12 text-center">
        <ChartColumn size={28} className="mx-auto text-[#6B7280] mb-3" />
        <p className="text-[#1C1C1C] font-medium mb-1">Este dashboard todavía no tiene widgets</p>
        <p className="text-sm text-[#6B7280]">
          Entrá a editarlo para agregar el primero.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-end gap-3 mb-4">
        <span className="text-xs text-[#6B7280]">
          Actualizado a las{' '}
          {new Intl.DateTimeFormat('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
          }).format(lastRefresh)}
        </span>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm text-[#1C1C1C] hover:border-[#3346CC] disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      <DashboardFilterBar
        filtros={dashboard.filtros}
        valores={valores}
        onChange={(id, value) => setValores((v) => ({ ...v, [id]: value }))}
      />

      <DashboardGrid
        widgets={dashboard.widgets}
        editable={false}
        filtros={filtrosActivos}
      />
    </>
  );
}
