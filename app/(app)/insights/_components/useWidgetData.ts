'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchInsightsQuery, insightsQueryKey } from '@/lib/api/insights';
import type { InsightsSpec } from '@/lib/insights/types';

/**
 * Datos de un widget.
 *
 * `staleTime` de 60s más el botón "Actualizar" del dashboard: alcanza para que
 * moverse entre dashboards no redispare N queries, y deja el control de cuándo
 * refrescar en manos del usuario en vez de en una revalidación de servidor.
 */
export function useWidgetData(spec: InsightsSpec, enabled = true) {
  const queryable =
    spec.mode === 'sql'
      ? spec.sql.trim().length > 0
      : spec.dimensions.length > 0 || spec.measures.length > 0;

  const query = useQuery({
    queryKey: insightsQueryKey(spec),
    queryFn: () => fetchInsightsQuery(spec),
    enabled: enabled && queryable,
    staleTime: 60_000,
    retry: false,
  });

  return {
    data: query.data?.data ?? [],
    columns: query.data?.columns ?? [],
    meta: query.data?.meta,
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
  };
}
