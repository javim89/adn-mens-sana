'use client';

import { useState } from 'react';
import { CustomSelect } from '@/app/components/ui/custom-select';
import { LayoutConLateral } from '@/app/components/ui/layout-con-lateral';
import { Panel } from '@/app/components/ui/panel';
import { motivosPrincipales } from '@/lib/triage/motivos';
import type { DeportistaWithRelations } from '@/lib/types/deportistas';
import type { NivelTriage, TriageContribucion } from '@/lib/types/triage';
import {
  DatosPersonalesSection,
  DatosDeportivosSection,
  DatosEscolaresSection,
  DatosSocialesSection,
  DatosSaludSection,
} from './DeportistaDetail';
import SeguimientosTimeline, {
  type SeguimientoTimelineItem,
} from './SeguimientosTimeline';
import TrayectoriaTimeline from './TrayectoriaTimeline';
import TriagePanel from './tabs/TriagePanel';
import FichaLateral from './FichaLateral';
import type { PeriodoDivision, TrayectoriaEvento } from '@/lib/types/trayectoria';

type DetailTabId =
  | 'personal'
  | 'deportivo'
  | 'escolar'
  | 'social'
  | 'salud'
  | 'seguimiento'
  | 'trayectoria'
  | 'triage';

const TABS: Array<{ id: DetailTabId; label: string }> = [
  { id: 'personal', label: 'Personal' },
  { id: 'deportivo', label: 'Deportivo' },
  { id: 'escolar', label: 'Escolar' },
  { id: 'social', label: 'Social' },
  { id: 'salud', label: 'Salud' },
  { id: 'seguimiento', label: 'Seguimientos' },
  { id: 'trayectoria', label: 'Trayectoria' },
  { id: 'triage', label: 'Triage' },
];

interface Catalogo {
  id: string;
  nombre: string;
}

interface TriageData {
  nivel: NivelTriage;
  puntajeTotal: number;
  desglose: TriageContribucion[];
  calculatedAt: string | Date;
}

interface Props {
  deportista: DeportistaWithRelations;
  seguimientos: SeguimientoTimelineItem[];
  periodos: PeriodoDivision[];
  eventos: TrayectoriaEvento[];
  disciplinas: Catalogo[];
  categorias: Catalogo[];
  triage: TriageData | null;
  /** Total de seguimientos del deportista. Sin él, se cuentan los recibidos. */
  seguimientosTotal?: number;
}

export default function DeportistaDetailTabs({
  deportista,
  seguimientos,
  periodos,
  eventos,
  disciplinas,
  categorias,
  triage,
  seguimientosTotal,
}: Props) {
  const [activeTab, setActiveTab] = useState<DetailTabId>('personal');
  const resumenTriage = triage
    ? { nivel: triage.nivel, puntaje: triage.puntajeTotal, motivos: motivosPrincipales(triage.desglose) }
    : null;

  return (
    <div>
      {/* Mobile: selector desplegable (sin scroll horizontal) */}
      <div className="sm:hidden mb-4">
        <CustomSelect
          value={activeTab}
          onChange={(v) => setActiveTab(v as DetailTabId)}
          options={TABS.map((t) => ({ value: t.id, label: t.label }))}
        />
      </div>

      {/* Desktop: barra de tabs con wrap (sin scroll) */}
      <div
        role="tablist"
        aria-label="Secciones del deportista"
        className="hidden sm:flex flex-wrap border-b border-border mb-4"
      >
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex items-center gap-1.5 px-3 md:px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
                isActive
                  ? 'border-primario text-primario'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              ].join(' ')}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <LayoutConLateral
        lateralLabel="Resumen del deportista"
        lateral={
          <FichaLateral
            triage={resumenTriage}
            seguimientosTotal={seguimientosTotal ?? seguimientos.length}
            onVerTriage={activeTab === 'triage' ? undefined : () => setActiveTab('triage')}
            onVerSeguimientos={
              activeTab === 'seguimiento' ? undefined : () => setActiveTab('seguimiento')
            }
          />
        }
      >
        {activeTab === 'trayectoria' ? (
          <TrayectoriaTimeline
            deportistaId={deportista.id}
            periodos={periodos}
            eventos={eventos}
            disciplinas={disciplinas}
            categorias={categorias}
            clubesAnteriores={deportista.clubesAnteriores}
            historiaDeportiva={deportista.historiaDeportiva}
          />
        ) : (
          <Panel className="p-4 md:p-6">
            {activeTab === 'personal' && <DatosPersonalesSection deportista={deportista} />}
            {activeTab === 'deportivo' && <DatosDeportivosSection deportista={deportista} />}
            {activeTab === 'escolar' && <DatosEscolaresSection deportista={deportista} />}
            {activeTab === 'social' && <DatosSocialesSection deportista={deportista} />}
            {activeTab === 'salud' && <DatosSaludSection deportista={deportista} />}
            {activeTab === 'seguimiento' && <SeguimientosTimeline seguimientos={seguimientos} />}
            {activeTab === 'triage' && <TriagePanel triage={triage} deportistaId={deportista.id} />}
          </Panel>
        )}
      </LayoutConLateral>
    </div>
  );
}
