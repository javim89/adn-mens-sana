'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';

interface EnumSelectProps<T extends string> {
  value: T | '';
  onChange: (v: T | '') => void;
  options: Record<T, string>;
  placeholder?: string;
  id?: string;
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
    <Select
      value={value}
      onValueChange={(v) => onChange(v === '__placeholder__' ? '' : (v as T))}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={`w-full ${className}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {(Object.entries(options) as [T, string][]).map(([k, label]) => (
          <SelectItem key={k} value={k}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
