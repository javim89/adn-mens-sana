'use client';

import { useRef } from 'react';
import type { EstadoAsistencia } from '@/lib/types/presentismo';
import { ESTADO_ASISTENCIA_LABELS } from '@/lib/utils/asistencia';

interface Props {
  value: EstadoAsistencia;
  onChange: (estado: EstadoAsistencia) => void;
  size?: 'sm' | 'md';
}

const ORDER: EstadoAsistencia[] = ['PRESENTE', 'AUSENTE', 'LLEGO_TARDE', 'SE_RETIRO_ANTES'];

const SHORT_LABELS: Record<EstadoAsistencia, string> = {
  PRESENTE: 'Pres',
  AUSENTE: 'Aus',
  LLEGO_TARDE: 'Tarde',
  SE_RETIRO_ANTES: 'Retiró',
};

const FULL_LABELS: Record<EstadoAsistencia, string> = {
  PRESENTE: 'Presente',
  AUSENTE: 'Ausente',
  LLEGO_TARDE: 'Tarde',
  SE_RETIRO_ANTES: 'Se retiró',
};

const ACTIVE_STYLES: Record<EstadoAsistencia, string> = {
  PRESENTE: 'bg-green-600 text-white border-green-600',
  AUSENTE: 'bg-red-600 text-white border-red-600',
  LLEGO_TARDE: 'bg-amber-500 text-white border-amber-500',
  SE_RETIRO_ANTES: 'bg-gray-500 text-white border-gray-500',
};

export default function AsistenciaEstadoControl({ value, onChange, size = 'md' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = (index + 1) % ORDER.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = (index - 1 + ORDER.length) % ORDER.length;
    }
    if (nextIndex === null) return;
    e.preventDefault();
    const next = ORDER[nextIndex];
    onChange(next);
    const buttons = containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    buttons?.[nextIndex]?.focus();
  }

  const padding = size === 'sm' ? 'px-2 py-1' : 'px-2.5 py-1.5';

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label="Estado de asistencia"
      className="inline-flex flex-wrap gap-1"
    >
      {ORDER.map((estado, index) => {
        const active = value === estado;
        return (
          <button
            key={estado}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={ESTADO_ASISTENCIA_LABELS[estado]}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(estado)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={[
              'border rounded-md text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3346CC]/40',
              padding,
              active
                ? ACTIVE_STYLES[estado]
                : 'bg-white text-[#6B7280] border-gray-200 hover:bg-[#F3F4F6]',
            ].join(' ')}
          >
            <span className="sm:hidden">{SHORT_LABELS[estado]}</span>
            <span className="hidden sm:inline">{FULL_LABELS[estado]}</span>
          </button>
        );
      })}
    </div>
  );
}
