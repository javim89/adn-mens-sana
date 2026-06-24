'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  error?: boolean;
  id?: string;
  className?: string;
  'aria-label'?: string;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Seleccionar...',
  disabled = false,
  size = 'md',
  error = false,
  id,
  className = '',
  'aria-label': ariaLabel,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? null;
  const isSmall = size === 'sm';

  function handleToggle() {
    if (disabled) return;
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPanelPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setOpen((v) => !v);
  }

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent) {
        if (e.key === 'Escape') setOpen(false);
        return;
      }
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleScroll(e: Event) {
      if (panelRef.current && panelRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    document.addEventListener('keydown', handle);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handle);
      document.removeEventListener('keydown', handle);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);

  const triggerClasses = [
    'inline-flex items-center justify-between w-full border rounded-lg bg-white',
    'focus-visible:outline-none focus-visible:ring-2 transition-colors',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    isSmall ? 'text-xs px-2.5 py-1.5 gap-1.5' : 'text-sm px-3 py-2 gap-2',
    error
      ? 'border-red-400 focus-visible:ring-red-300/40'
      : open
        ? 'border-[#121A61] focus-visible:ring-[#3346CC]/30'
        : 'border-gray-200 hover:border-gray-300 focus-visible:ring-[#3346CC]/30',
  ].join(' ');

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        onClick={handleToggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={triggerClasses}
      >
        <span className={selectedLabel ? 'text-[#1C1C1C]' : 'text-[#6B7280]'}>
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDown
          size={isSmall ? 12 : 14}
          className={`shrink-0 text-[#6B7280] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          ref={panelRef}
          role="listbox"
          style={{ top: panelPos.top, left: panelPos.left, width: Math.max(panelPos.width, 160) }}
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg overflow-y-auto max-h-60"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={[
                  'flex items-center justify-between w-full px-3 py-2 text-sm text-left transition-colors',
                  isSelected
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-[#1C1C1C] hover:bg-[#F3F4F6]',
                ].join(' ')}
              >
                {opt.label}
                {isSelected && <Check size={14} className="shrink-0 text-blue-700 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
