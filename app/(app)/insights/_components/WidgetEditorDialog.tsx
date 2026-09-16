'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Database, Palette, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { CustomSelect } from '@/app/components/ui/custom-select';
import { fetchInsightsQuery, insightsQueryKey } from '@/lib/api/insights';
import { CLIENT_DATASETS } from '@/lib/insights/catalog-client';
import {
  VISUALIZATIONS,
  VIZ_GROUP_LABELS,
  checkCompatibility,
  firstCompatibleViz,
  type VizGroup,
  type VizId,
} from '@/lib/insights/visualizations';
import type { InsightsSpec, QuerySpec, RawSqlSpec } from '@/lib/insights/types';
import VisualBuilder from './VisualBuilder';
import SqlEditor from './SqlEditor';
import WidgetRenderer from './WidgetRenderer';
import type { VizConfig } from './charts/types';

export interface WidgetDraft {
  id?: string;
  titulo: string;
  descripcion?: string;
  tipo: VizId;
  querySpec: InsightsSpec;
  vizConfig: VizConfig;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `undefined` = crear uno nuevo. */
  widget?: WidgetDraft;
  dashboardNombre: string;
  onSave: (draft: WidgetDraft) => void;
}

function emptyDraft(): WidgetDraft {
  const dataset = CLIENT_DATASETS[0];
  return {
    titulo: '',
    tipo: 'table',
    querySpec: {
      mode: 'builder',
      dataset: dataset.id,
      dimensions: [],
      measures: dataset.measures[0] ? [dataset.measures[0].id] : [],
    },
    vizConfig: { type: 'table' },
  };
}

const GROUP_ORDER: VizGroup[] = ['metrica', 'tendencia', 'comparacion', 'distribucion', 'tabla'];

/**
 * Modal de creación/edición de widget: panel de configuración a la izquierda y
 * preview en vivo a la derecha, como en las capturas de referencia.
 *
 * El preview ejecuta la query real contra `/api/insights/query` con un debounce,
 * así lo que se ve es exactamente lo que va a quedar guardado — no una
 * aproximación con datos de ejemplo.
 */
export default function WidgetEditorDialog({
  open,
  onOpenChange,
  widget,
  dashboardNombre,
  onSave,
}: Props) {
  const [draft, setDraft] = useState<WidgetDraft>(widget ?? emptyDraft());
  const [tab, setTab] = useState<'data' | 'custom'>('data');

  // Nota: el estado NO se reinicia con un effect al abrir. El padre le pasa una
  // `key` distinta a este componente por cada widget editado, así React lo
  // remonta y el `useState` de arriba vuelve a correr con el widget correcto.
  // Sincronizar con un effect dispararía un render en cascada por cada apertura.

  // Debounce del spec para no disparar una query por tecla.
  const [debouncedSpec, setDebouncedSpec] = useState<InsightsSpec>(draft.querySpec);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSpec(draft.querySpec), 400);
    return () => clearTimeout(t);
  }, [draft.querySpec]);

  const isBuilder = draft.querySpec.mode === 'builder';

  // Un spec de builder sin medidas ni dimensiones no compila: no se consulta.
  const specIsQueryable =
    debouncedSpec.mode === 'sql'
      ? debouncedSpec.sql.trim().length > 0
      : debouncedSpec.dimensions.length > 0 || debouncedSpec.measures.length > 0;

  const preview = useQuery({
    queryKey: insightsQueryKey(debouncedSpec),
    queryFn: () => fetchInsightsQuery(debouncedSpec),
    enabled: open && specIsQueryable,
    staleTime: 60_000,
    retry: false,
  });

  const compatibility = useMemo(() => {
    if (draft.querySpec.mode !== 'builder') {
      // En modo SQL no hay catálogo contra el cual validar: se permite todo y
      // el chart resuelve con las columnas que vuelvan.
      return new Map<VizId, { compatible: boolean; reason?: string }>();
    }
    const spec = draft.querySpec;
    return new Map(
      VISUALIZATIONS.map((v) => [
        v.id,
        checkCompatibility(v.id, {
          dimensions: spec.dimensions,
          measures: spec.measures,
          timeDimension: spec.timeDimension,
        }),
      ]),
    );
  }, [draft.querySpec]);

  const setSpec = (querySpec: InsightsSpec) => {
    setDraft((d) => {
      // Si el tipo actual dejó de ser compatible con el spec nuevo, se cambia
      // al primero que sí lo sea en vez de guardar una combinación que rompe.
      let tipo = d.tipo;
      if (querySpec.mode === 'builder') {
        const check = checkCompatibility(tipo, {
          dimensions: querySpec.dimensions,
          measures: querySpec.measures,
          timeDimension: querySpec.timeDimension,
        });
        if (!check.compatible) {
          tipo = firstCompatibleViz({
            dimensions: querySpec.dimensions,
            measures: querySpec.measures,
            timeDimension: querySpec.timeDimension,
          });
        }
      }
      return { ...d, querySpec, tipo, vizConfig: { ...d.vizConfig, type: tipo } };
    });
  };

  const setTipo = (tipo: VizId) =>
    setDraft((d) => ({ ...d, tipo, vizConfig: { ...d.vizConfig, type: tipo } }));

  const setVizConfig = (partial: Partial<VizConfig>) =>
    setDraft((d) => ({ ...d, vizConfig: { ...d.vizConfig, ...partial } }));

  const puedeGuardar = draft.titulo.trim().length > 0 && specIsQueryable;

  const columnas = preview.data?.columns ?? [];
  const medidas = columnas.filter((c) => c.role === 'measure');
  const dimensiones = columnas.filter((c) => c.role === 'dimension');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
          <DialogTitle style={{ fontFamily: 'Oswald, sans-serif' }}>
            {widget ? 'Editar widget' : 'Crear widget'}
          </DialogTitle>
          <DialogDescription>
            Configurá los datos y la apariencia para {dashboardNombre} sin salir del editor.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
          {/* ---------------- Configuración ---------------- */}
          <div className="overflow-y-auto p-6 space-y-5">
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#F3F4F6] rounded-lg">
              {(
                [
                  ['data', 'Datos', Database],
                  ['custom', 'Apariencia', Palette],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={tab === id}
                  onClick={() => setTab(id)}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm transition-colors ${
                    tab === id ? 'bg-white text-[#121A61] shadow-sm' : 'text-[#6B7280]'
                  }`}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>

            {tab === 'data' ? (
              <>
                <div>
                  <label
                    htmlFor="widget-tipo"
                    className="block text-sm font-medium text-[#1C1C1C] mb-1.5"
                  >
                    Tipo de visualización
                  </label>
                  <select
                    id="widget-tipo"
                    value={draft.tipo}
                    onChange={(e) => setTipo(e.target.value as VizId)}
                    className="h-9 w-full rounded-md border border-gray-200 px-2 text-sm bg-white"
                  >
                    {GROUP_ORDER.map((group) => (
                      <optgroup key={group} label={VIZ_GROUP_LABELS[group]}>
                        {VISUALIZATIONS.filter((v) => v.group === group).map((viz) => {
                          const check = compatibility.get(viz.id);
                          const incompatible = check && !check.compatible;
                          return (
                            <option key={viz.id} value={viz.id} disabled={incompatible}>
                              {viz.label}
                              {incompatible ? ` — ${check?.reason}` : ''}
                            </option>
                          );
                        })}
                      </optgroup>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs text-[#6B7280]">
                    {VISUALIZATIONS.find((v) => v.id === draft.tipo)?.description}
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="widget-titulo"
                    className="block text-sm font-medium text-[#1C1C1C] mb-1.5"
                  >
                    Título
                  </label>
                  <input
                    id="widget-titulo"
                    value={draft.titulo}
                    onChange={(e) => setDraft((d) => ({ ...d, titulo: e.target.value }))}
                    placeholder="Deportistas por disciplina"
                    className="h-9 w-full rounded-md border border-gray-200 px-2 text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="widget-desc"
                    className="block text-sm font-medium text-[#1C1C1C] mb-1.5"
                  >
                    Descripción <span className="text-[#6B7280] font-normal">(opcional)</span>
                  </label>
                  <textarea
                    id="widget-desc"
                    rows={2}
                    value={draft.descripcion ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, descripcion: e.target.value }))}
                    className="w-full rounded-md border border-gray-200 p-2 text-sm"
                  />
                </div>

                <div className="inline-flex rounded-md border border-gray-200 overflow-hidden">
                  {(
                    [
                      ['builder', 'Constructor visual'],
                      ['sql', 'SQL'],
                    ] as const
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={draft.querySpec.mode === mode}
                      onClick={() =>
                        setSpec(
                          mode === 'sql'
                            ? ({ mode: 'sql', sql: '' } satisfies RawSqlSpec)
                            : (emptyDraft().querySpec as QuerySpec),
                        )
                      }
                      className={`px-3 py-1.5 text-xs transition-colors ${
                        draft.querySpec.mode === mode
                          ? 'bg-[#121A61] text-white'
                          : 'bg-white text-[#6B7280]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {isBuilder ? (
                  <VisualBuilder
                    spec={draft.querySpec as QuerySpec}
                    onChange={(spec) => setSpec(spec)}
                  />
                ) : (
                  <SqlEditor
                    sql={(draft.querySpec as RawSqlSpec).sql}
                    onChange={(sql) => setSpec({ mode: 'sql', sql })}
                  />
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
                      Eje de categorías
                    </label>
                    <CustomSelect
                      value={draft.vizConfig.xKey ?? ''}
                      onChange={(xKey) => setVizConfig({ xKey: xKey || undefined })}
                      options={[
                        { value: '', label: 'Automático' },
                        ...dimensiones.map((c) => ({ value: c.id, label: c.label })),
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
                      Formato numérico
                    </label>
                    <CustomSelect
                      value={draft.vizConfig.numberFormat ?? ''}
                      onChange={(f) =>
                        setVizConfig({
                          numberFormat: (f || undefined) as VizConfig['numberFormat'],
                        })
                      }
                      options={[
                        { value: '', label: 'Según la medida' },
                        { value: 'integer', label: 'Entero' },
                        { value: 'decimal', label: 'Decimal' },
                        { value: 'percent', label: 'Porcentaje' },
                      ]}
                    />
                  </div>
                </div>

                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-[#1C1C1C] mb-1">Mostrar</legend>
                  {(
                    [
                      ['showLegend', 'Leyenda'],
                      ['showGrid', 'Grilla de fondo'],
                      ['showDataLabels', 'Etiquetas de valor'],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draft.vizConfig[key] ?? key !== 'showDataLabels'}
                        onChange={(e) => setVizConfig({ [key]: e.target.checked })}
                        className="rounded border-gray-300 text-[#121A61] focus:ring-[#3346CC]"
                      />
                      {label}
                    </label>
                  ))}
                </fieldset>

                <div>
                  <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
                    Orientación de las barras
                  </label>
                  <CustomSelect
                    value={draft.vizConfig.orientation ?? 'vertical'}
                    onChange={(o) =>
                      setVizConfig({ orientation: o as VizConfig['orientation'] })
                    }
                    options={[
                      { value: 'vertical', label: 'Verticales' },
                      { value: 'horizontal', label: 'Horizontales' },
                    ]}
                  />
                </div>

                {draft.tipo === 'kpi' && (
                  <div>
                    <label
                      htmlFor="kpi-label"
                      className="block text-sm font-medium text-[#1C1C1C] mb-1.5"
                    >
                      Etiqueta bajo el número
                    </label>
                    <input
                      id="kpi-label"
                      value={draft.vizConfig.label ?? ''}
                      onChange={(e) => setVizConfig({ label: e.target.value || undefined })}
                      placeholder={medidas[0]?.label ?? 'Etiqueta'}
                      className="h-9 w-full rounded-md border border-gray-200 px-2 text-sm"
                    />
                  </div>
                )}

                {draft.tipo === 'progress' && (
                  <div>
                    <label
                      htmlFor="progress-target"
                      className="block text-sm font-medium text-[#1C1C1C] mb-1.5"
                    >
                      Objetivo
                    </label>
                    <input
                      id="progress-target"
                      type="number"
                      value={draft.vizConfig.target ?? ''}
                      onChange={(e) => setVizConfig({ target: Number(e.target.value) })}
                      className="h-9 w-full rounded-md border border-gray-200 px-2 text-sm"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ---------------- Preview ---------------- */}
          <div className="p-6 flex flex-col min-h-0 bg-[#F9FAFB]">
            <div className="flex items-baseline justify-between mb-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                Vista previa
              </p>
              {preview.data && (
                <p className="text-xs text-[#6B7280]">
                  {preview.data.meta.rowCount}{' '}
                  {preview.data.meta.rowCount === 1 ? 'fila' : 'filas'}
                  {preview.data.meta.truncated && ' (recortadas)'}
                </p>
              )}
            </div>
            <div className="flex-1 min-h-[280px] bg-white rounded-xl border border-gray-100 p-3">
              {!specIsQueryable ? (
                <div className="h-full flex items-center justify-center text-sm text-[#6B7280] text-center px-4">
                  {isBuilder
                    ? 'Elegí al menos una dimensión o una medida.'
                    : 'Escribí una consulta para ver el resultado.'}
                </div>
              ) : (
                <WidgetRenderer
                  data={preview.data?.data ?? []}
                  columns={columnas}
                  config={draft.vizConfig}
                  isLoading={preview.isLoading}
                  error={preview.error ? (preview.error as Error).message : null}
                />
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm text-[#6B7280] hover:text-[#1C1C1C]"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!puedeGuardar}
            onClick={() => {
              onSave(draft);
              onOpenChange(false);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#121A61] text-white text-sm hover:bg-[#1E2A8A] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save size={15} />
            {widget ? 'Guardar cambios' : 'Agregar widget'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
