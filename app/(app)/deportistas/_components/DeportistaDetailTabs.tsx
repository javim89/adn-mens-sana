'use client';

import { useState } from 'react';
import { CustomSelect } from '@/app/components/ui/custom-select';
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
  { id: 'personal', label: 'Datos Personales' },
  { id: 'deportivo', label: 'Datos Deportivos' },
  { id: 'escolar', label: 'Datos Escolares' },
  { id: 'social', label: 'Datos Sociales' },
  { id: 'salud', label: 'Salud' },
  { id: 'seguimiento', label: 'Seguimiento' },
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
}

export default function DeportistaDetailTabs({
  deportista,
  seguimientos,
  periodos,
  eventos,
  disciplinas,
  categorias,
  triage,
}: Props) {
  const [activeTab, setActiveTab] = useState<DetailTabId>('personal');

  return (
    <div>
      {/* Mobile: selector desplegable (sin scroll horizontal) */}
      <div className="sm:hidden mb-6">
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
        className="hidden sm:flex flex-wrap border-b border-gray-200 mb-6"
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
                'flex items-center gap-1.5 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
                isActive
                  ? 'border-[#121A61] text-[#121A61]'
                  : 'border-transparent text-[#6B7280] hover:text-[#1C1C1C] hover:border-gray-300',
              ].join(' ')}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Contenido de la tab activa */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {activeTab === 'personal' && <DatosPersonalesSection deportista={deportista} />}
        {activeTab === 'deportivo' && <DatosDeportivosSection deportista={deportista} />}
        {activeTab === 'escolar' && <DatosEscolaresSection deportista={deportista} />}
        {activeTab === 'social' && <DatosSocialesSection deportista={deportista} />}
        {activeTab === 'salud' && <DatosSaludSection deportista={deportista} />}
        {activeTab === 'seguimiento' && (
          <SeguimientosTimeline seguimientos={seguimientos} />
        )}
        {activeTab === 'trayectoria' && (
          <TrayectoriaTimeline
            deportistaId={deportista.id}
            periodos={periodos}
            eventos={eventos}
            disciplinas={disciplinas}
            categorias={categorias}
          />
        )}
        {activeTab === 'triage' && (
          <TriagePanel triage={triage} deportistaId={deportista.id} />
        )}
      </div>
    </div>
  );
}
