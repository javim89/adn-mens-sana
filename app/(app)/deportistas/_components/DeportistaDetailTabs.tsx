'use client';

import { useState } from 'react';
import { Stethoscope } from 'lucide-react';
import { CustomSelect } from '@/app/components/ui/custom-select';
import type { DeportistaWithRelations } from '@/lib/types/deportistas';
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

type DetailTabId =
  | 'personal'
  | 'deportivo'
  | 'escolar'
  | 'social'
  | 'salud'
  | 'seguimiento'
  | 'triage';

const TABS: Array<{ id: DetailTabId; label: string }> = [
  { id: 'personal', label: 'Datos Personales' },
  { id: 'deportivo', label: 'Datos Deportivos' },
  { id: 'escolar', label: 'Datos Escolares' },
  { id: 'social', label: 'Datos Sociales' },
  { id: 'salud', label: 'Salud' },
  { id: 'seguimiento', label: 'Seguimiento' },
  { id: 'triage', label: 'Triage' },
];

interface Props {
  deportista: DeportistaWithRelations;
  seguimientos: SeguimientoTimelineItem[];
}

function TriagePlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Stethoscope size={40} className="text-[#6B7280] mb-3" />
      <h3
        className="text-xl font-bold text-[#121A61]"
        style={{ fontFamily: 'Oswald, sans-serif' }}
      >
        Triage
      </h3>
      <p className="text-sm text-[#6B7280] mt-1">Próximamente / En construcción</p>
    </div>
  );
}

export default function DeportistaDetailTabs({ deportista, seguimientos }: Props) {
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
        {activeTab === 'triage' && <TriagePlaceholder />}
      </div>
    </div>
  );
}
