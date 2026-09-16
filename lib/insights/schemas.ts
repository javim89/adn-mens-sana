/**
 * Validación de todo lo que entra al módulo de Insights desde el cliente.
 *
 * El route handler y las server actions comparten estos schemas a propósito: un
 * `querySpec` guardado en un widget termina, tarde o temprano, en el compilador
 * de SQL. Validarlo solo al ejecutar deja widgets rotos persistidos en la base;
 * validarlo al escribir los rechaza antes.
 *
 * La validación es estructural **y** semántica: además de la forma, se chequea
 * que el dataset exista en el catálogo y que cada dimensión/medida/filtro/orden
 * pertenezca a ese dataset.
 */

import { z } from 'zod';
import { getDataset } from './catalog';
import { MAX_DIMENSIONS } from './compile';
import { validateRawSql } from './sql-guard';
import type { FilterCondition, FilterGroup, QuerySpec, RawSqlSpec } from './types';
import { isFilterGroup } from './types';
import { VIZ_BY_ID, type VizId } from './visualizations';

// ---------------------------------------------------------------------------
// Primitivas
// ---------------------------------------------------------------------------

export const OPERATORS = [
  'eq',
  'ne',
  'contains',
  'starts_with',
  'in',
  'not_in',
  'lt',
  'lte',
  'gt',
  'gte',
  'between',
  'last_n_days',
  'this_month',
  'last_month',
  'this_year',
  'is_true',
  'is_false',
  'is_null',
  'is_not_null',
] as const;

const TIME_GRAINS = ['day', 'week', 'month', 'quarter', 'year'] as const;

/** Tope defensivo: un árbol de filtros más grande que esto no es del editor. */
const MAX_FILTER_NODES = 100;

export const vizIdSchema = z.custom<VizId>(
  (value) => typeof value === 'string' && value in VIZ_BY_ID,
  { message: 'Tipo de visualización desconocido' },
);

const filterConditionSchema: z.ZodType<FilterCondition> = z.object({
  field: z.string().min(1),
  operator: z.enum(OPERATORS),
  value: z.unknown().optional(),
});

const filterGroupSchema: z.ZodType<FilterGroup> = z.lazy(() =>
  z.object({
    op: z.enum(['all', 'any']),
    children: z.array(z.union([filterGroupSchema, filterConditionSchema])),
  }),
);

const sortSpecSchema = z.object({
  field: z.string().min(1),
  direction: z.enum(['asc', 'desc']),
});

// ---------------------------------------------------------------------------
// QuerySpec
// ---------------------------------------------------------------------------

function walkFilters(
  node: FilterGroup | FilterCondition,
  visit: (condition: FilterCondition) => void,
  budget: { left: number },
): void {
  if (budget.left-- <= 0) throw new Error('Árbol de filtros demasiado grande');
  if (isFilterGroup(node)) {
    for (const child of node.children) walkFilters(child, visit, budget);
    return;
  }
  visit(node);
}

const querySpecShape = z.object({
  mode: z.literal('builder'),
  dataset: z.string().min(1),
  dimensions: z.array(z.string().min(1)).default([]),
  measures: z.array(z.string().min(1)).default([]),
  filters: filterGroupSchema.optional(),
  timeGrain: z.enum(TIME_GRAINS).optional(),
  timeDimension: z.string().min(1).optional(),
  sort: z.array(sortSpecSchema).optional(),
  limit: z.number().int().positive().optional(),
});

export const querySpecSchema: z.ZodType<QuerySpec> = querySpecShape.superRefine(
  (spec, ctx) => {
    const dataset = getDataset(spec.dataset);
    if (!dataset) {
      ctx.addIssue({
        code: 'custom',
        path: ['dataset'],
        message: `Dataset desconocido "${spec.dataset}"`,
      });
      return;
    }

    const dimensionIds = new Set(dataset.dimensions.map((d) => d.id));
    const measureIds = new Set(dataset.measures.map((m) => m.id));

    spec.dimensions.forEach((id, i) => {
      if (!dimensionIds.has(id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['dimensions', i],
          message: `Dimensión desconocida "${id}" para el dataset "${dataset.id}"`,
        });
      }
    });

    spec.measures.forEach((id, i) => {
      if (!measureIds.has(id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['measures', i],
          message: `Medida desconocida "${id}" para el dataset "${dataset.id}"`,
        });
      }
    });

    if (new Set(spec.dimensions).size > MAX_DIMENSIONS) {
      ctx.addIssue({
        code: 'custom',
        path: ['dimensions'],
        message: `La query no puede tener más de ${MAX_DIMENSIONS} dimensiones`,
      });
    }

    if (spec.dimensions.length === 0 && spec.measures.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['measures'],
        message: 'La query debe tener al menos una dimensión o una medida',
      });
    }

    if (spec.filters) {
      try {
        walkFilters(
          spec.filters,
          (condition) => {
            const dim = dataset.dimensions.find((d) => d.id === condition.field);
            if (!dim) {
              ctx.addIssue({
                code: 'custom',
                path: ['filters'],
                message: `Dimensión desconocida "${condition.field}" para el dataset "${dataset.id}"`,
              });
              return;
            }
            if (dim.filterable === false) {
              ctx.addIssue({
                code: 'custom',
                path: ['filters'],
                message: `La dimensión "${dim.id}" no es filtrable`,
              });
            }
          },
          { left: MAX_FILTER_NODES },
        );
      } catch {
        ctx.addIssue({
          code: 'custom',
          path: ['filters'],
          message: `El árbol de filtros no puede tener más de ${MAX_FILTER_NODES} nodos`,
        });
      }
    }

    const selectable = new Set([...spec.dimensions, ...spec.measures]);
    spec.sort?.forEach((entry, i) => {
      if (!selectable.has(entry.field)) {
        ctx.addIssue({
          code: 'custom',
          path: ['sort', i, 'field'],
          message: `El campo de orden "${entry.field}" no está en el SELECT`,
        });
      }
    });

    if (spec.timeDimension !== undefined) {
      const dim = dataset.dimensions.find((d) => d.id === spec.timeDimension);
      if (!dim) {
        ctx.addIssue({
          code: 'custom',
          path: ['timeDimension'],
          message: `Dimensión desconocida "${spec.timeDimension}" para el dataset "${dataset.id}"`,
        });
      } else if (dim.type !== 'date') {
        ctx.addIssue({
          code: 'custom',
          path: ['timeDimension'],
          message: `La dimensión "${dim.id}" no es de tipo date`,
        });
      } else if (!spec.dimensions.includes(dim.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['timeDimension'],
          message: `timeDimension "${dim.id}" no está entre las dimensiones seleccionadas`,
        });
      }
    }
  },
);

export const rawSqlSpecSchema: z.ZodType<RawSqlSpec> = z
  .object({
    mode: z.literal('sql'),
    sql: z.string().min(1, 'La consulta SQL no puede estar vacía'),
  })
  .superRefine((spec, ctx) => {
    const validation = validateRawSql(spec.sql);
    if (!validation.ok) {
      ctx.addIssue({ code: 'custom', path: ['sql'], message: validation.error });
    }
  });

export const insightsSpecSchema = z.union([querySpecSchema, rawSqlSpecSchema]);

export const queryRequestSchema = z.object({
  spec: insightsSpecSchema,
});

// ---------------------------------------------------------------------------
// Persistencia: dashboards, widgets y filtros
// ---------------------------------------------------------------------------

export const vizConfigSchema = z
  .object({ type: vizIdSchema })
  .catchall(z.unknown());

export const dashboardInputSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es requerido').max(120),
  descripcion: z.string().trim().max(500).nullish(),
});

export const widgetInputSchema = z
  .object({
    id: z.string().min(1).optional(),
    titulo: z.string().trim().min(1, 'El título es requerido').max(160),
    descripcion: z.string().trim().max(500).nullish(),
    tipo: vizIdSchema.optional(),
    querySpec: insightsSpecSchema,
    vizConfig: vizConfigSchema,
    x: z.number().int().min(0).max(11).default(0),
    y: z.number().int().min(0).default(0),
    w: z.number().int().min(1).max(12).default(6),
    h: z.number().int().min(1).max(100).default(6),
  })
  .superRefine((widget, ctx) => {
    if (widget.tipo !== undefined && widget.tipo !== widget.vizConfig.type) {
      ctx.addIssue({
        code: 'custom',
        path: ['tipo'],
        message: 'El tipo del widget no coincide con el de su vizConfig',
      });
    }
  });

export const dashboardLayoutSchema = z.array(widgetInputSchema).max(100);

export const filterInputSchema = z
  .object({
    id: z.string().min(1).optional(),
    label: z.string().trim().min(1, 'La etiqueta es requerida').max(120),
    dataset: z.string().min(1),
    dimension: z.string().min(1),
    operator: z.enum(OPERATORS),
    valorDefault: z.unknown().optional(),
    orden: z.number().int().min(0).default(0),
    widgetIds: z.array(z.string().min(1)).default([]),
  })
  .superRefine((filter, ctx) => {
    const dataset = getDataset(filter.dataset);
    if (!dataset) {
      ctx.addIssue({
        code: 'custom',
        path: ['dataset'],
        message: `Dataset desconocido "${filter.dataset}"`,
      });
      return;
    }
    const dim = dataset.dimensions.find((d) => d.id === filter.dimension);
    if (!dim) {
      ctx.addIssue({
        code: 'custom',
        path: ['dimension'],
        message: `Dimensión desconocida "${filter.dimension}" para el dataset "${dataset.id}"`,
      });
      return;
    }
    if (dim.filterable === false) {
      ctx.addIssue({
        code: 'custom',
        path: ['dimension'],
        message: `La dimensión "${dim.id}" no es filtrable`,
      });
    }
  });

export type DashboardInput = z.infer<typeof dashboardInputSchema>;
export type WidgetInput = z.input<typeof widgetInputSchema>;
export type FilterInput = z.input<typeof filterInputSchema>;

// ---------------------------------------------------------------------------
// Errores
// ---------------------------------------------------------------------------

/** Primer issue en un string legible: `dimensions.0: Dimensión desconocida …`. */
export function formatZodError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return 'Datos inválidos';
  const path = issue.path.join('.');
  return path ? `${path}: ${issue.message}` : issue.message;
}
