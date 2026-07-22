'use client';

import { CustomSelect, type CustomSelectOption } from '@/app/components/ui/custom-select';
import type { CalendarioCategoria } from '@/lib/queries/calendario';

interface CalendarioFiltroProps {
  categorias: CalendarioCategoria[];
  value: string; // categoriaId o '' para "Todas"
  onChange: (value: string) => void;
}

export default function CalendarioFiltro({ categorias, value, onChange }: CalendarioFiltroProps) {
  const options: CustomSelectOption[] = [
    { value: '', label: 'Todas las categorías' },
    ...categorias.map((c) => ({ value: c.id, label: c.nombre })),
  ];

  return (
    <div className="w-full sm:w-56">
      <label
        htmlFor="cal-filtro-categoria"
        className="block text-xs font-medium text-[#6B7280] mb-1"
      >
        Categoría
      </label>
      <CustomSelect
        id="cal-filtro-categoria"
        value={value}
        onChange={onChange}
        options={options}
        placeholder="Todas las categorías"
      />
    </div>
  );
}
