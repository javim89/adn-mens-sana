/**
 * Catálogo de tipos de visualización.
 *
 * El editor lo usa para poblar el menú de tipos agrupado y para **deshabilitar**
 * los incompatibles con el QuerySpec actual, en vez de dejar elegir uno que va a
 * romper al renderizar.
 */

export type VizId =
  | 'kpi'
  | 'comparison'
  | 'progress'
  | 'line'
  | 'area'
  | 'bar'
  | 'grouped_bar'
  | 'stacked_bar'
  | 'percent_stacked_bar'
  | 'composed'
  | 'pie'
  | 'donut'
  | 'table';

export type VizGroup = 'metrica' | 'tendencia' | 'comparacion' | 'distribucion' | 'tabla';

export const VIZ_GROUP_LABELS: Record<VizGroup, string> = {
  metrica: 'Métrica',
  tendencia: 'Tendencia',
  comparacion: 'Comparación',
  distribucion: 'Distribución',
  tabla: 'Tabla',
};

export interface VisualizationType {
  id: VizId;
  label: string;
  group: VizGroup;
  description: string;
  minDimensions: number;
  /** `null` = sin tope. */
  maxDimensions: number | null;
  minMeasures: number;
  maxMeasures: number | null;
  requiresDateDimension: boolean;
}

export const VISUALIZATIONS: VisualizationType[] = [
  {
    id: 'kpi',
    label: 'KPI',
    group: 'metrica',
    description: 'Un único número grande con su etiqueta.',
    minDimensions: 0,
    maxDimensions: 0,
    minMeasures: 1,
    maxMeasures: 1,
    requiresDateDimension: false,
  },
  {
    id: 'comparison',
    label: 'Comparación',
    group: 'metrica',
    description: 'Valor actual contra uno de referencia, con la diferencia.',
    minDimensions: 0,
    maxDimensions: 0,
    minMeasures: 2,
    maxMeasures: 2,
    requiresDateDimension: false,
  },
  {
    id: 'progress',
    label: 'Progreso',
    group: 'metrica',
    description: 'Barra de avance de una medida hacia un objetivo.',
    minDimensions: 0,
    maxDimensions: 0,
    minMeasures: 1,
    maxMeasures: 1,
    requiresDateDimension: false,
  },
  {
    id: 'line',
    label: 'Línea',
    group: 'tendencia',
    description: 'Evolución de una o más medidas en el tiempo.',
    minDimensions: 1,
    maxDimensions: 1,
    minMeasures: 1,
    maxMeasures: null,
    requiresDateDimension: true,
  },
  {
    id: 'area',
    label: 'Área',
    group: 'tendencia',
    description: 'Como la de línea, con el área bajo la curva rellena.',
    minDimensions: 1,
    maxDimensions: 1,
    minMeasures: 1,
    maxMeasures: null,
    requiresDateDimension: true,
  },
  {
    id: 'bar',
    label: 'Barra',
    group: 'comparacion',
    description: 'Compara una medida entre las categorías de una dimensión.',
    minDimensions: 1,
    maxDimensions: 1,
    minMeasures: 1,
    maxMeasures: null,
    requiresDateDimension: false,
  },
  {
    id: 'grouped_bar',
    label: 'Barra agrupada',
    group: 'comparacion',
    description: 'Una barra por cada valor de la segunda dimensión, lado a lado.',
    minDimensions: 1,
    maxDimensions: 2,
    minMeasures: 1,
    maxMeasures: null,
    requiresDateDimension: false,
  },
  {
    id: 'stacked_bar',
    label: 'Barra apilada',
    group: 'comparacion',
    description: 'Series apiladas: muestra el total y su composición.',
    minDimensions: 1,
    maxDimensions: 2,
    minMeasures: 1,
    maxMeasures: null,
    requiresDateDimension: false,
  },
  {
    id: 'percent_stacked_bar',
    label: 'Barra apilada 100%',
    group: 'comparacion',
    description: 'Composición relativa de cada categoría, normalizada a 100%.',
    minDimensions: 1,
    maxDimensions: 2,
    minMeasures: 1,
    maxMeasures: null,
    requiresDateDimension: false,
  },
  {
    id: 'composed',
    label: 'Compuesto',
    group: 'comparacion',
    description: 'Barras y línea combinadas sobre el mismo eje.',
    minDimensions: 1,
    maxDimensions: 2,
    minMeasures: 2,
    maxMeasures: null,
    requiresDateDimension: false,
  },
  {
    id: 'pie',
    label: 'Torta',
    group: 'distribucion',
    description: 'Peso de cada categoría sobre el total.',
    minDimensions: 1,
    maxDimensions: 1,
    minMeasures: 1,
    maxMeasures: 1,
    requiresDateDimension: false,
  },
  {
    id: 'donut',
    label: 'Dona',
    group: 'distribucion',
    description: 'Como la torta, con el total en el centro.',
    minDimensions: 1,
    maxDimensions: 1,
    minMeasures: 1,
    maxMeasures: 1,
    requiresDateDimension: false,
  },
  {
    id: 'table',
    label: 'Tabla',
    group: 'tabla',
    description: 'Los datos crudos, sin agregar ninguna forma.',
    minDimensions: 0,
    maxDimensions: null,
    minMeasures: 0,
    maxMeasures: null,
    requiresDateDimension: false,
  },
];

export const VIZ_BY_ID: Record<VizId, VisualizationType> = Object.fromEntries(
  VISUALIZATIONS.map((v) => [v.id, v]),
) as Record<VizId, VisualizationType>;

export const VIZ_GROUPS: VizGroup[] = ['metrica', 'tendencia', 'comparacion', 'distribucion', 'tabla'];

export function visualizationsByGroup(group: VizGroup): VisualizationType[] {
  return VISUALIZATIONS.filter((v) => v.group === group);
}

/** Subconjunto del QuerySpec que alcanza para decidir compatibilidad. */
export interface VizSpecShape {
  dimensions: string[];
  measures: string[];
  /** Id de la dimensión `date` sobre la que aplica el timeGrain, si hay. */
  timeDimension?: string | null;
}

export interface CompatibilityResult {
  compatible: boolean;
  /** Motivo en español, para el tooltip del ítem deshabilitado. */
  reason?: string;
}

function plural(n: number, singular: string, pluralWord: string): string {
  return n === 1 ? singular : pluralWord;
}

export function checkCompatibility(vizId: string, spec: VizSpecShape): CompatibilityResult {
  const viz = VIZ_BY_ID[vizId as VizId];
  if (!viz) return { compatible: false, reason: 'Tipo de visualización desconocido' };

  const dims = spec.dimensions.length;
  const measures = spec.measures.length;

  if (dims < viz.minDimensions) {
    return {
      compatible: false,
      reason: `Requiere al menos ${viz.minDimensions} ${plural(viz.minDimensions, 'dimensión', 'dimensiones')}`,
    };
  }
  if (viz.maxDimensions !== null && dims > viz.maxDimensions) {
    return {
      compatible: false,
      reason:
        viz.maxDimensions === 0
          ? 'No admite dimensiones'
          : `Admite como máximo ${viz.maxDimensions} ${plural(viz.maxDimensions, 'dimensión', 'dimensiones')}`,
    };
  }
  if (measures < viz.minMeasures) {
    return {
      compatible: false,
      reason: `Requiere al menos ${viz.minMeasures} ${plural(viz.minMeasures, 'medida', 'medidas')}`,
    };
  }
  if (viz.maxMeasures !== null && measures > viz.maxMeasures) {
    return {
      compatible: false,
      reason: `Admite como máximo ${viz.maxMeasures} ${plural(viz.maxMeasures, 'medida', 'medidas')}`,
    };
  }
  if (viz.requiresDateDimension) {
    const timeDim = spec.timeDimension;
    if (!timeDim || !spec.dimensions.includes(timeDim)) {
      return { compatible: false, reason: 'Requiere una dimensión de fecha' };
    }
  }

  return { compatible: true };
}

export function isCompatible(vizId: string, spec: VizSpecShape): boolean {
  return checkCompatibility(vizId, spec).compatible;
}

/** Primer tipo compatible, recorriendo el catálogo en orden. `table` siempre lo es. */
export function firstCompatibleViz(spec: VizSpecShape): VizId {
  return VISUALIZATIONS.find((v) => isCompatible(v.id, spec))?.id ?? 'table';
}
