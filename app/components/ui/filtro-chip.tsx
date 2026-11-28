'use client';

import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/app/components/ui/command';

/**
 * Filtro en forma de píldora (popover + lista navegable con teclado de cmdk). Es
 * controlado: el padre guarda el valor (normalmente en la URL) y lo vuelve a pasar.
 *
 * ```tsx
 * // Simple: un valor o null ("Todos").
 * <FiltroChip
 *   label="Disciplina"
 *   opciones={disciplinas.map((d) => ({ value: d.id, label: d.nombre }))}
 *   valor={disciplinaId}
 *   onChange={(v) => setParam('disciplina', v)}
 *   buscar
 * />
 *
 * // Múltiple: array de valores ([] = "Todos").
 * <FiltroChip
 *   label="Prioridad"
 *   modo="multiple"
 *   opciones={PRIORIDADES}
 *   valor={prioridades}
 *   onChange={(v) => setParam('prioridad', v)}
 * />
 * ```
 *
 * Texto del botón:
 * - sin valor → `label` (estilo neutro);
 * - simple → "Label: Opción";
 * - múltiple con 1 → "Label: Opción"; con 2 o más → "Label: N".
 * Con valor, la píldora se resalta (`bg-primario-suave text-primario`).
 *
 * - `todosLabel`: texto de la opción que limpia el filtro (default "Todos").
 * - `buscar`: agrega un input de búsqueda arriba de la lista (para listas largas).
 * - En `simple` elegir una opción cierra el popover; en `multiple` queda abierto para
 *   seguir tildando.
 */
export interface OpcionFiltro {
  value: string;
  label: string;
}

interface FiltroChipBase {
  label: string;
  opciones: OpcionFiltro[];
  buscar?: boolean;
  todosLabel?: string;
  className?: string;
  align?: 'start' | 'center' | 'end';
  disabled?: boolean;
}

export interface FiltroChipSimpleProps extends FiltroChipBase {
  modo?: 'simple';
  valor: string | null;
  onChange: (valor: string | null) => void;
}

export interface FiltroChipMultipleProps extends FiltroChipBase {
  modo: 'multiple';
  valor: string[];
  onChange: (valor: string[]) => void;
}

export type FiltroChipProps = FiltroChipSimpleProps | FiltroChipMultipleProps;

const VALOR_TODOS = '__todos__';

const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** Busca solo en el texto visible (keywords), no en el `value` (que suele ser un id). */
function filtrarPorTexto(_value: string, busqueda: string, keywords?: string[]): number {
  const texto = normalizar((keywords ?? []).join(' '));
  return texto.includes(normalizar(busqueda)) ? 1 : 0;
}

export function FiltroChip(props: FiltroChipProps) {
  const {
    label,
    opciones,
    buscar = false,
    todosLabel = 'Todos',
    className,
    align = 'start',
    disabled,
  } = props;
  const [abierto, setAbierto] = React.useState(false);
  const listaRef = React.useRef<HTMLDivElement>(null);

  const seleccionados: string[] =
    props.modo === 'multiple' ? props.valor : props.valor ? [props.valor] : [];
  const activo = seleccionados.length > 0;
  const labelDe = (v: string) => opciones.find((o) => o.value === v)?.label ?? v;

  const texto = !activo
    ? label
    : seleccionados.length === 1
      ? `${label}: ${labelDe(seleccionados[0])}`
      : `${label}: ${seleccionados.length}`;

  function limpiar() {
    if (props.modo === 'multiple') props.onChange([]);
    else props.onChange(null);
    setAbierto(false);
  }

  function elegir(v: string) {
    if (props.modo === 'multiple') {
      const siguiente = props.valor.includes(v)
        ? props.valor.filter((x) => x !== v)
        : [...props.valor, v];
      props.onChange(siguiente);
    } else {
      props.onChange(v);
      setAbierto(false);
    }
  }

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger
        disabled={disabled}
        data-activo={activo ? '' : undefined}
        className={cn(
          'inline-flex h-9 min-w-0 max-w-full shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          activo
            ? 'border-primario/30 bg-primario-suave text-primario hover:border-primario/50'
            : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
          className,
        )}
      >
        <span className="truncate">{texto}</span>
        <ChevronDown
          aria-hidden
          className={cn('size-3.5 shrink-0 transition-transform', abierto && 'rotate-180')}
        />
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-60 p-0"
        onOpenAutoFocus={(e) => {
          // Sin buscador no hay nada enfocable adentro: el foco va a la raíz de cmdk para que
          // las flechas y Enter funcionen. Con buscador, Radix enfoca el input.
          if (buscar) return;
          e.preventDefault();
          listaRef.current?.focus();
        }}
      >
        <Command
          ref={listaRef}
          tabIndex={-1}
          shouldFilter={buscar}
          filter={filtrarPorTexto}
          label={label}
          className="outline-none"
        >
          {buscar && <CommandInput placeholder={`Buscar ${label.toLowerCase()}…`} />}
          <CommandList>
            {buscar && <CommandEmpty>Sin resultados.</CommandEmpty>}
            <CommandGroup>
              <CommandItem
                value={VALOR_TODOS}
                keywords={[todosLabel]}
                aria-checked={!activo}
                onSelect={limpiar}
              >
                <Check aria-hidden className={cn('text-primario', activo && 'invisible')} />
                {todosLabel}
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              {opciones.map((op) => {
                const marcado = seleccionados.includes(op.value);
                return (
                  <CommandItem
                    key={op.value}
                    value={op.value}
                    keywords={[op.label]}
                    aria-checked={marcado}
                    data-checked={marcado ? '' : undefined}
                    onSelect={() => elegir(op.value)}
                  >
                    <Check aria-hidden className={cn('text-primario', !marcado && 'invisible')} />
                    <span className="truncate">{op.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default FiltroChip;
