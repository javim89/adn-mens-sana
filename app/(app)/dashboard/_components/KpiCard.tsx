import Link from 'next/link';
import VariacionBadge from './VariacionBadge';
import type { Sentido, Variacion } from '../_lib/variacion';
import {
  ACENTOS,
  ALERTA_AMBAR,
  ALERTA_ROSA,
  HERO,
  OSWALD,
  type ModuloDashboard,
} from '../_lib/acentos';

export type VarianteKpi = 'default' | 'hero' | 'alerta-ambar' | 'alerta-rosa';

const LINK_DEFAULT = 'text-[#3346CC] hover:text-[#121A61]';

/** Las clases de cada variante. Literales: Tailwind no ve clases concatenadas. */
function clasesDe(variante: VarianteKpi, bordeSuperior: string) {
  switch (variante) {
    case 'hero':
      return { ...HERO, badge: 'bg-white/15 text-white', foco: 'focus-visible:outline-white' };
    case 'alerta-ambar':
      return { ...ALERTA_AMBAR, foco: 'focus-visible:outline-amber-900' };
    case 'alerta-rosa':
      return { ...ALERTA_ROSA, foco: 'focus-visible:outline-rose-900' };
    default:
      return {
        card: `bg-white border border-gray-100 ${bordeSuperior}`,
        label: 'text-[#6B7280]',
        valor: 'text-[#121A61]',
        detalle: 'text-[#6B7280]',
        link: LINK_DEFAULT,
        badge: 'bg-gray-100 text-[#1C1C1C]',
        foco: 'focus-visible:outline-[#3346CC]',
      };
  }
}

/**
 * Una card de número grande.
 *
 * `tabular-nums` no es cosmético: sin él los dígitos tienen ancho distinto y el
 * número salta cuando cambia. Mismo tratamiento que `KpiChart.tsx` de Insights.
 *
 * El link lleva `aria-label` explícito porque "Ver deportistas" aparece varias veces
 * en la página: sin el label, un lector de pantalla lista varios links idénticos sin
 * forma de distinguirlos.
 *
 * **Variantes:** `default` es la card blanca con el borde superior del módulo; `hero`
 * es la destacada navy de un bloque; las `alerta-*` son las tintadas que piden
 * revisión, y son las únicas que deberían llevar `badge`. El link va con `mt-auto` para
 * que las cards de una misma fila queden alineadas abajo aunque el detalle varíe.
 */
export default function KpiCard({
  label,
  valor,
  detalle,
  variacion,
  sentido = 'menos_es_mejor',
  href,
  linkLabel,
  ariaLabel,
  variante = 'default',
  modulo,
  bordeSuperior,
  badge,
  children,
}: {
  label: string;
  valor: number | string;
  /** Subtítulo: el rango de la semana, el desglose, o la aclaración de qué mide. */
  detalle?: string;
  variacion?: Variacion;
  sentido?: Sentido;
  href?: string;
  linkLabel?: string;
  ariaLabel?: string;
  variante?: VarianteKpi;
  /** El módulo del borde superior (solo en `default`). */
  modulo?: ModuloDashboard;
  /** Borde superior explícito, para un acento que no es de un módulo (ámbar en 0). */
  bordeSuperior?: string;
  /** Pill en la esquina superior derecha ("REVISAR", "URGENTE"). */
  badge?: string;
  /** La mini-visualización entre el detalle y el link. */
  children?: React.ReactNode;
}) {
  const c = clasesDe(
    variante,
    bordeSuperior ?? (modulo ? ACENTOS[modulo].bordeSuperior : ''),
  );

  return (
    <div className={`${c.card} rounded-2xl shadow-sm p-5 md:p-6 flex h-full min-w-0 flex-col`}>
      <div className="flex items-start justify-between gap-3">
        <p className={`text-sm font-medium ${c.label}`}>{label}</p>
        {badge && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${c.badge}`}
          >
            {badge}
          </span>
        )}
      </div>
      <p
        className={`mt-3 text-6xl md:text-7xl font-semibold leading-none tabular-nums ${c.valor}`}
        style={OSWALD}
      >
        {valor}
      </p>
      {variacion && (
        <div className="mt-3">
          <VariacionBadge
            variacion={variacion}
            sentido={sentido}
            sobreOscuro={variante === 'hero'}
          />
        </div>
      )}
      {detalle && <p className={`mt-2 text-xs ${c.detalle}`}>{detalle}</p>}
      {children && <div className="@container mt-5">{children}</div>}
      {href && linkLabel && (
        <div className="mt-auto pt-5">
          <Link
            href={href}
            aria-label={ariaLabel ?? linkLabel}
            className={`inline-block rounded text-sm font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 ${c.link} ${c.foco}`}
          >
            {linkLabel} →
          </Link>
        </div>
      )}
    </div>
  );
}
