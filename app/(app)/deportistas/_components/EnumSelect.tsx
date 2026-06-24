'use client';

import CustomSelect from '@/app/components/ui/CustomSelect';

interface EnumSelectProps<T extends string> {
  value: T | '';
  onChange: (v: T | '') => void;
  options: Record<T, string>;
  placeholder?: string;
  id: string;
  className?: string;
  disabled?: boolean;
}

export default function EnumSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder = 'Seleccionar...',
  id,
  className = '',
  disabled = false,
}: EnumSelectProps<T>) {
  const allOptions = [
    { value: '', label: placeholder },
    ...(Object.entries(options) as [T, string][]).map(([k, label]) => ({ value: k, label })),
  ];

  return (
    <CustomSelect
      id={id}
      value={value}
      onChange={(v) => onChange(v as T | '')}
      options={allOptions}
      disabled={disabled}
      className={`w-full ${className}`}
    />
  );
}
