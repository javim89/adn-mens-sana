'use client';

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
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as T | '')}
      disabled={disabled}
      className={[
        'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30 text-[#1C1C1C] bg-white disabled:bg-gray-50 disabled:cursor-not-allowed',
        className,
      ].join(' ')}
    >
      <option value="">{placeholder}</option>
      {(Object.entries(options) as [T, string][]).map(([k, label]) => (
        <option key={k} value={k}>
          {label}
        </option>
      ))}
    </select>
  );
}
