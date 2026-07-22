'use client';

export type TabId = 'personal' | 'deportivo' | 'escolar' | 'social' | 'salud';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'personal', label: 'Datos Personales' },
  { id: 'deportivo', label: 'Datos Deportivos' },
  { id: 'escolar', label: 'Datos Escolares' },
  { id: 'social', label: 'Datos Sociales' },
  { id: 'salud', label: 'Salud' },
];

interface DeportistaFormTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  tabsWithErrors: Partial<Record<TabId, boolean>>;
}

export default function DeportistaFormTabs({
  activeTab,
  onTabChange,
  tabsWithErrors,
}: DeportistaFormTabsProps) {
  return (
    <div className="relative">
      {/* Barra de tabs: scroll horizontal en mobile, scrollbar oculta,
          eje Y fijado para evitar el scrollbar vertical fantasma. El borde
          inferior vive en el contenedor de scroll y los botones lo solapan
          con -mb-px (se mantiene el look actual). */}
      <div
        role="tablist"
        className="flex border-b border-gray-200 mb-6 overflow-x-auto overflow-y-hidden snap-x scrollbar-hide"
      >
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          const hasError = tabsWithErrors[tab.id];

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.id)}
              className={[
                'flex items-center gap-1.5 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px snap-start transition-colors',
                isActive
                  ? 'border-[#121A61] text-[#121A61]'
                  : 'border-transparent text-[#6B7280] hover:text-[#1C1C1C] hover:border-gray-300',
                hasError ? 'text-red-600 border-red-400' : '',
              ].join(' ')}
            >
              {tab.label}
              {hasError && (
                <span className="inline-flex items-center justify-center w-4 h-4 text-xs bg-red-500 text-white rounded-full">
                  !
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Fade a la derecha que insinúa más tabs por scroll. Parte de blanco
          puro para fundirse con el card. Oculto en md+ donde entran todas. */}
      <div
        aria-hidden="true"
        data-testid="tabs-fade"
        className="pointer-events-none absolute top-0 right-0 h-full w-10 bg-gradient-to-l from-white to-transparent md:hidden"
      />
    </div>
  );
}
