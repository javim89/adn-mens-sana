import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Anillo de porcentaje (presentismo, cumplimiento de objetivos…). SVG con `role="img"` y
 * `aria-label` con el porcentaje; lo que se pase como `children` va centrado adentro
 * (visual: el lector de pantalla lee solo el `aria-label`).
 *
 * ```tsx
 * <Anillo valor={82} label="Presentismo semanal" />
 * <Anillo valor={64} tamano={88} grosor={9}>
 *   <span className="font-mono text-sm font-semibold">64%</span>
 * </Anillo>
 * ```
 *
 * - `valor`: 0–100; se recorta a ese rango (y `NaN` cuenta como 0).
 * - `tamano` (px, default 64) y `grosor` (px del trazo sobre el viewBox de 64, default 7).
 * - `label`: prefijo del `aria-label` → "Presentismo semanal: 82%". Sin él: "82%".
 * - `claseTrazo` / `claseFondo`: clases `stroke-*` del progreso y de la pista (default
 *   `stroke-primario` / `stroke-muted`). `claseTrazo` admite además una clase de animación
 *   (`landing-anillo`): el trazo usa `pathLength=100`, así que la animación parte de
 *   `stroke-dashoffset: 100`.
 */
export interface AnilloProps {
  valor: number;
  tamano?: number;
  grosor?: number;
  label?: string;
  children?: ReactNode;
  claseTrazo?: string;
  claseFondo?: string;
  className?: string;
}

export function clampPorcentaje(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  return Math.min(100, Math.max(0, valor));
}

const VIEWBOX = 64;

export function Anillo({
  valor,
  tamano = 64,
  grosor = 7,
  label,
  children,
  claseTrazo = 'stroke-primario',
  claseFondo = 'stroke-muted',
  className,
}: AnilloProps) {
  const pct = clampPorcentaje(valor);
  const texto = `${Math.round(pct)}%`;
  const radio = (VIEWBOX - grosor) / 2 - 2.5;
  const centro = VIEWBOX / 2;

  return (
    <div
      role="img"
      aria-label={label ? `${label}: ${texto}` : texto}
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
    >
      <svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        width={tamano}
        height={tamano}
        className="-rotate-90"
        aria-hidden
        focusable="false"
      >
        <circle cx={centro} cy={centro} r={radio} fill="none" strokeWidth={grosor} className={claseFondo} />
        {pct > 0 && (
          <circle
            data-slot="progreso"
            cx={centro}
            cy={centro}
            r={radio}
            fill="none"
            strokeWidth={grosor}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={100}
            strokeDashoffset={100 - pct}
            className={claseTrazo}
          />
        )}
      </svg>
      {children && (
        <div aria-hidden className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}

export default Anillo;
