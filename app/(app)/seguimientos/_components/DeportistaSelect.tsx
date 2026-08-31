'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronDown, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface DeportistaOption {
  id: string;
  nombre: string;
  apellido: string;
}

interface Props {
  value: DeportistaOption[];
  onChange: (next: DeportistaOption[]) => void;
}

async function searchDeportistas(search: string): Promise<DeportistaOption[]> {
  const params = new URLSearchParams({ 'page[size]': '20' });
  if (search) params.set('filter[search]', search);
  const res = await fetch(`/api/deportistas?${params}`);
  if (!res.ok) return [];
  const json = await res.json();
  return (json.data ?? []).map(
    (d: { id: string; attributes: { nombre: string; apellido: string } }) => ({
      id: d.id,
      nombre: d.attributes.nombre,
      apellido: d.attributes.apellido,
    }),
  );
}

export default function DeportistaSelect({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: options = [], isLoading } = useQuery({
    queryKey: ['deportistas-search', search],
    queryFn: () => searchDeportistas(search),
    enabled: open,
  });

  function toggle(dep: DeportistaOption) {
    if (value.some((d) => d.id === dep.id)) {
      onChange(value.filter((d) => d.id !== dep.id));
    } else {
      onChange([...value, dep]);
    }
  }

  function remove(id: string) {
    onChange(value.filter((d) => d.id !== id));
  }

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
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((dep) => (
            <span
              key={dep.id}
              className="inline-flex items-center gap-1 text-xs font-medium bg-[#121A61] text-white px-2.5 py-1 rounded-full"
            >
              {dep.apellido}, {dep.nombre}
              <button
                type="button"
                onClick={() => remove(dep.id)}
                className="ml-0.5 hover:opacity-70 transition-opacity"
                aria-label={`Quitar ${dep.apellido}`}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:border-[#3346CC]/50 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30 transition-colors text-left"
      >
        <span className="text-[#6B7280]">
          {value.length > 0
            ? `${value.length} deportista${value.length === 1 ? '' : 's'} seleccionado${value.length === 1 ? '' : 's'}`
            : 'Buscar deportista...'}
        </span>
        <ChevronDown
          size={14}
          className={`text-[#6B7280] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B7280]"
              />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, apellido o DNI..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
              />
            </div>
          </div>

          <ul className="max-h-52 overflow-y-auto">
            {isLoading ? (
              <li className="px-3 py-6 text-center text-sm text-[#6B7280]">Cargando...</li>
            ) : options.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-[#6B7280]">
                No se encontraron deportistas
              </li>
            ) : (
              options.map((dep) => {
                const selected = value.some((d) => d.id === dep.id);
                return (
                  <li key={dep.id}>
                    <button
                      type="button"
                      onClick={() => toggle(dep)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-left hover:bg-[#F3F4F6] transition-colors ${selected ? 'bg-[#F3F4F6]' : ''}`}
                    >
                      <span className="font-medium text-[#1C1C1C]">
                        {dep.apellido}, {dep.nombre}
                      </span>
                      {selected && <Check size={14} className="text-[#121A61] shrink-0" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
