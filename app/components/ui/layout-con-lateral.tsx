import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Grilla contenido principal + columna lateral de ~300px (resúmenes, próximos turnos…).
 * Debajo de `lg` la columna lateral se apila después del contenido.
 *
 * ```tsx
 * <LayoutConLateral lateral={<><Panel titulo="Abiertos por tipo">…</Panel></>}>
 *   <SeguimientosTable … />
 * </LayoutConLateral>
 * ```
 *
 * - `lateral` se renderiza en un `<aside>`; `lateralLabel` le da nombre accesible.
 * - Los hijos de cada columna se separan con `gap-4` (no hace falta `space-y`).
 */
export interface LayoutConLateralProps {
  children: ReactNode;
  lateral: ReactNode;
  lateralLabel?: string;
  className?: string;
  lateralClassName?: string;
}

export function LayoutConLateral({
  children,
  lateral,
  lateralLabel,
  className,
  lateralClassName,
}: LayoutConLateralProps) {
  return (
    <div className={cn('grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6', className)}>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
      <aside aria-label={lateralLabel} className={cn('flex min-w-0 flex-col gap-4', lateralClassName)}>
        {lateral}
      </aside>
    </div>
  );
}

export default LayoutConLateral;
