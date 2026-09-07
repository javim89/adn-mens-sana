'use client';

import { useState, useTransition } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/app/components/ui/card';
import { recomputeTriageAction } from '@/lib/actions/triage';
import type {
  AreaTriage,
  NivelTriage,
  TriageContribucion,
} from '@/lib/types/triage';

interface TriageData {
  nivel: NivelTriage;
  puntajeTotal: number;
  desglose: TriageContribucion[];
  calculatedAt: string | Date;
}

interface Props {
  triage: TriageData | null;
  deportistaId: string;
}

const NIVEL_TRIAGE_META: Record<
  NivelTriage,
  { label: string; badge: string; description: string }
> = {
  VERDE: {
    label: 'Verde — Sin alerta',
    badge: 'bg-green-100 text-green-700',
    description:
      'Sin indicadores de vulnerabilidad activos. Continuar seguimiento de rutina.',
  },
  AMARILLO: {
    label: 'Amarillo — Atención',
    badge: 'bg-yellow-100 text-yellow-800',
    description: 'Indicadores leves. Monitorear y dar seguimiento sostenido.',
  },
  NARANJA: {
    label: 'Naranja — Riesgo Moderado',
    badge: 'bg-orange-100 text-orange-700',
    description:
      'Riesgo moderado. Se recomienda intervención interdisciplinaria coordinada.',
  },
  ROJO: {
    label: 'Rojo — Riesgo Alto',
    badge: 'bg-red-100 text-red-700',
    description:
      'Situación crítica. Requiere atención inmediata y coordinación urgente.',
  },
};

const AREA_LABELS: Record<AreaTriage, string> = {
  MEDICA: 'Salud / Médica',
  NUTRICIONAL: 'Nutricional',
  PSICOLOGICA: 'Psicológica',
  EDUCACIONAL: 'Educacional',
  SOCIAL: 'Social',
  DEPORTIVA: 'Deportiva',
  COMPUESTA: 'Vulnerabilidad compuesta',
};

const AREA_ORDER: AreaTriage[] = [
  'MEDICA',
  'NUTRICIONAL',
  'PSICOLOGICA',
  'EDUCACIONAL',
  'SOCIAL',
  'DEPORTIVA',
  'COMPUESTA',
];

function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

function groupByArea(
  desglose: TriageContribucion[],
): Array<{ area: AreaTriage; items: TriageContribucion[]; subtotal: number }> {
  const map = new Map<AreaTriage, TriageContribucion[]>();
  for (const c of desglose) {
    const list = map.get(c.area) ?? [];
    list.push(c);
    map.set(c.area, list);
  }
  return AREA_ORDER.filter((area) => map.has(area)).map((area) => {
    const items = map.get(area) ?? [];
    return {
      area,
      items,
      subtotal: items.reduce((sum, i) => sum + i.puntos, 0),
    };
  });
}

export default function TriagePanel({ triage, deportistaId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRecompute() {
    setError(null);
    startTransition(async () => {
      const result = await recomputeTriageAction(deportistaId);
      if (!result.success) {
        setError(result.error);
      }
    });
  }

  if (triage === null) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Activity size={40} className="text-[#6B7280] mb-3" />
        <h3
          className="text-xl font-bold text-[#121A61]"
          style={{ fontFamily: 'Oswald, sans-serif' }}
        >
          Sin triage calculado aún
        </h3>
        <p className="text-sm text-[#6B7280] mt-1 max-w-md">
          El triage se calcula automáticamente cada semana (lunes). También podés
          recalcularlo ahora mismo.
        </p>
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        <Button
          type="button"
          onClick={handleRecompute}
          disabled={isPending}
          className="mt-5"
        >
          <RefreshCw size={16} className={isPending ? 'animate-spin' : ''} />
          {isPending ? 'Recalculando…' : 'Recalcular ahora'}
        </Button>
      </div>
    );
  }

  const meta = NIVEL_TRIAGE_META[triage.nivel];
  const grupos = groupByArea(triage.desglose);

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <h2
            className="text-2xl font-bold text-[#121A61]"
            style={{ fontFamily: 'Oswald, sans-serif' }}
          >
            Triage
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={[
                'text-sm font-semibold px-3 py-1.5 rounded-full',
                meta.badge,
              ].join(' ')}
            >
              {meta.label}
            </span>
            <span className="text-sm font-medium text-[#1C1C1C]">
              Puntaje total: {triage.puntajeTotal}
            </span>
          </div>
          <p className="text-sm text-[#6B7280] max-w-xl">{meta.description}</p>
          <p className="text-xs text-[#6B7280]">
            Última actualización: {formatDateTime(triage.calculatedAt)}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <Button type="button" onClick={handleRecompute} disabled={isPending}>
            <RefreshCw size={16} className={isPending ? 'animate-spin' : ''} />
            {isPending ? 'Recalculando…' : 'Recalcular ahora'}
          </Button>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>

      {/* Desglose por área */}
      {grupos.length === 0 ? (
        <p className="text-sm text-[#6B7280]">
          No hay indicadores que hayan sumado puntos en este cálculo.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {grupos.map((grupo) => (
            <Card key={grupo.area}>
              <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-2">
                <CardTitle className="text-base text-[#121A61]">
                  {AREA_LABELS[grupo.area]}
                </CardTitle>
                <span className="text-xs font-semibold text-[#6B7280]">
                  Subtotal +{grupo.subtotal}
                </span>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <ul className="divide-y divide-gray-100">
                  {grupo.items.map((item, idx) => (
                    <li
                      key={`${grupo.area}-${idx}`}
                      className="flex items-center justify-between gap-3 py-2"
                    >
                      <span className="text-sm text-[#1C1C1C]">
                        {item.regla}
                      </span>
                      <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-[#EEF0FB] text-[#121A61]">
                        +{item.puntos}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
