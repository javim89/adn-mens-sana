import type { AreaTriage, TriageContribucion } from '@/lib/types/triage';

const AREAS: readonly AreaTriage[] = [
  'MEDICA',
  'NUTRICIONAL',
  'PSICOLOGICA',
  'EDUCACIONAL',
  'SOCIAL',
  'DEPORTIVA',
  'COMPUESTA',
];

function esContribucion(valor: unknown): valor is TriageContribucion {
  if (typeof valor !== 'object' || valor === null) return false;
  const v = valor as Record<string, unknown>;
  return (
    typeof v.regla === 'string' &&
    typeof v.puntos === 'number' &&
    Number.isFinite(v.puntos) &&
    typeof v.area === 'string' &&
    (AREAS as readonly string[]).includes(v.area)
  );
}

/**
 * Lee `Triage.desglose` (JSON de la DB) como lista de contribuciones. Descarta lo
 * que no tenga la forma de `TriageContribucion`: un snapshot viejo o mal formado
 * no puede romper la ficha ni el panel del dashboard.
 */
export function parseDesglose(desglose: unknown): TriageContribucion[] {
  return Array.isArray(desglose) ? desglose.filter(esContribucion) : [];
}

/**
 * Las `n` reglas que más puntos sumaron, como texto legible (la `regla` ya es el
 * rótulo que escribe `computeTriage`). A igual puntaje se respeta el orden del
 * desglose, que es el orden en que se evalúan las reglas.
 */
export function motivosPrincipales(desglose: unknown, n = 2): string[] {
  return parseDesglose(desglose)
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.puntos > 0)
    .sort((a, b) => b.c.puntos - a.c.puntos || a.i - b.i)
    .slice(0, Math.max(0, n))
    .map(({ c }) => c.regla);
}
