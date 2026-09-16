/**
 * Cliente de la API de Insights para los hooks de TanStack Query.
 * API interna: JSON plano (no JSON:API, a diferencia de `lib/api/deportistas.ts`).
 */

import type { ColumnMeta, InsightsSpec, Row } from '@/lib/insights/types';

export type InsightsQueryMeta = {
  rowCount: number;
  /** El servidor recortó filas para que el payload entre en 2 MB. */
  truncated: boolean;
  elapsedMs: number;
};

export type InsightsQueryResponse = {
  data: Row[];
  columns: ColumnMeta[];
  meta: InsightsQueryMeta;
};

async function throwIfNotOk(res: Response): Promise<void> {
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // respuesta sin cuerpo JSON: queda el status
    }
    throw new Error(message);
  }
}

/**
 * POST /api/insights/query
 */
export async function fetchInsightsQuery(
  spec: InsightsSpec,
): Promise<InsightsQueryResponse> {
  const res = await fetch('/api/insights/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ spec }),
  });
  await throwIfNotOk(res);
  return res.json() as Promise<InsightsQueryResponse>;
}

/** Clave estable para TanStack Query: el spec completo identifica el resultado. */
export function insightsQueryKey(spec: InsightsSpec): [string, InsightsSpec] {
  return ['insights-query', spec];
}
