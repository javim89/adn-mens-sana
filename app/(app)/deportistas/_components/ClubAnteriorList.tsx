'use client';

import { Plus, Trash2 } from 'lucide-react';

interface ClubItem {
  nombre: string;
  periodo?: string;
}

interface ClubAnteriorListProps {
  clubs: ClubItem[];
  onChange: (clubs: ClubItem[]) => void;
  disabled?: boolean;
}

export default function ClubAnteriorList({ clubs, onChange, disabled = false }: ClubAnteriorListProps) {
  function addClub() {
    onChange([...clubs, { nombre: '', periodo: '' }]);
  }

  function removeClub(index: number) {
    onChange(clubs.filter((_, i) => i !== index));
  }

  function updateClub(index: number, field: keyof ClubItem, value: string) {
    onChange(
      clubs.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    );
  }

  return (
    <div className={`space-y-3${disabled ? ' opacity-50' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[#1C1C1C]">Clubes anteriores</span>
        <button
          type="button"
          onClick={addClub}
          disabled={disabled}
          className="flex items-center gap-1.5 text-xs text-[#121A61] hover:text-[#1E2A8A] border border-[#121A61]/30 rounded-lg px-2.5 py-1.5 transition-colors disabled:cursor-not-allowed"
        >
          <Plus size={12} />
          Agregar club
        </button>
      </div>

      {clubs.length === 0 ? (
        <p className="text-sm text-[#6B7280] italic">Sin clubes anteriores registrados</p>
      ) : (
        <div className="space-y-2">
          {clubs.map((club, index) => (
            <div key={index} className="flex gap-2 items-center">
              <input
                type="text"
                value={club.nombre}
                onChange={(e) => updateClub(index, 'nombre', e.target.value)}
                placeholder="Nombre del club"
                disabled={disabled}
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30 disabled:cursor-not-allowed"
              />
              <input
                type="text"
                value={club.periodo ?? ''}
                onChange={(e) => updateClub(index, 'periodo', e.target.value)}
                placeholder="Período (ej: 2019-2021)"
                disabled={disabled}
                className="w-36 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => removeClub(index)}
                aria-label="Eliminar club"
                disabled={disabled}
                className="text-red-400 hover:text-red-600 p-1.5 rounded transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
