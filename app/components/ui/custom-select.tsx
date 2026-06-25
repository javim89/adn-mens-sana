'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CustomSelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  searchable?: boolean;
  className?: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Seleccionar...',
  id,
  disabled = false,
  searchable = false,
  className,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = searchable
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(optValue: string) {
    onChange(optValue);
    setOpen(false);
    setSearch('');
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:border-[#3346CC]/50 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={selected ? 'text-[#1C1C1C]' : 'text-[#6B7280]'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`text-[#6B7280] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && !disabled && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
                />
              </div>
            </div>
          )}

          <ul className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-[#6B7280]">Sin resultados</li>
            ) : (
              filtered.map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-[#F3F4F6] transition-colors"
                  >
                    <Check
                      size={14}
                      className={`shrink-0 text-[#121A61] ${value === opt.value ? 'opacity-100' : 'opacity-0'}`}
                    />
                    <span className="text-[#1C1C1C]">{opt.label}</span>
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
