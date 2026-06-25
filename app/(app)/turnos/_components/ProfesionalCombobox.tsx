'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { ROL_LABELS } from '@/lib/roles';
import type { Profesional } from '@/lib/types/turnos';
import type { AppRole } from '@/lib/roles';

interface Props {
  profesionales: Profesional[];
  value: string;
  onChange: (id: string) => void;
}

export default function ProfesionalCombobox({ profesionales, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = profesionales.find((p) => p.id === value);

  const filtered = profesionales.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.nombre.toLowerCase().includes(q) ||
      p.apellido.toLowerCase().includes(q) ||
      (ROL_LABELS[p.rol as AppRole] ?? p.rol).toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:border-[#3346CC]/50 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30 transition-colors text-left"
      >
        {selected ? (
          <span className="text-[#1C1C1C] truncate">
            {selected.apellido}, {selected.nombre}
            <span className="text-[#6B7280] ml-1">
              — {ROL_LABELS[selected.rol as AppRole] ?? selected.rol}
            </span>
          </span>
        ) : (
          <span className="text-[#6B7280]">Seleccionar profesional...</span>
        )}
        <ChevronDown
          size={14}
          className={`text-[#6B7280] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B7280]" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar profesional..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
              />
            </div>
          </div>

          <ul className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-[#6B7280]">
                No se encontraron profesionales
              </li>
            ) : (
              filtered.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(p.id);
                      setOpen(false);
                      setSearch('');
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left hover:bg-[#F3F4F6] transition-colors"
                  >
                    <Check
                      size={14}
                      className={`shrink-0 text-[#121A61] ${value === p.id ? 'opacity-100' : 'opacity-0'}`}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-[#1C1C1C]">
                        {p.apellido}, {p.nombre}
                      </span>
                      <span className="text-xs text-[#6B7280]">
                        {ROL_LABELS[p.rol as AppRole] ?? p.rol}
                      </span>
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
