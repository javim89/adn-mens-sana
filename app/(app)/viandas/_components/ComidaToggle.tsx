'use client';

import { Loader2, Check } from 'lucide-react';
import { LUGAR_RETIRO_LABELS, TIPO_COMIDA_LABELS } from '@/lib/utils/enum-labels';
import { horaEnArgentina } from '@/lib/utils/fecha';
import type { EntregaView } from '@/lib/types/viandas';
import type { TipoComida } from '@/lib/generated/prisma/enums';

/** Abreviaturas para mobile, donde no entran las cuatro etiquetas completas. */
const CORTO: Record<TipoComida, string> = {
  DESAYUNO: 'Des',
  ALMUERZO: 'Alm',
  MERIENDA: 'Mer',
  CENA: 'Cena',
};

interface Props {
  comida: TipoComida;
  /** Para el aria-label: "Almuerzo de Pérez, Juan". */
  deportistaNombre: string;
  entrega?: EntregaView;
  /** Nombre resuelto de quien entregó; cae al id si Clerk no lo devolvió. */
  entregadoPorNombre?: string;
  /**
   * Si la ficha del deportista prevé esta comida. NO habilita ni deshabilita:
   * cualquier comida se puede registrar para cualquiera. Solo cambia el color,
   * para que se vea de un vistazo cuándo lo entregado se aparta de la ficha.
   */
  previstaEnFicha: boolean;
  /**
   * Sin lugar de retiro resuelto (admin que no eligió, responsable sin lugar
   * asignado) o mirando una fecha pasada, que es solo lectura. El motivo lo
   * decide el panel: acá solo se muestra.
   */
  bloqueado: boolean;
  motivoBloqueo?: string;
  /**
   * El bloqueo es por estar mirando un día pasado, no por algo que se pueda
   * resolver. Cambia solo el contraste: ver `atenuado` abajo.
   */
  soloLectura?: boolean;
  pendiente: boolean;
  onToggle: () => void;
}

export default function ComidaToggle({
  comida,
  deportistaNombre,
  entrega,
  entregadoPorNombre,
  previstaEnFicha,
  bloqueado,
  motivoBloqueo,
  soloLectura = false,
  pendiente,
  onToggle,
}: Props) {
  const marcada = !!entrega;
  const label = TIPO_COMIDA_LABELS[comida];

  const fueraDeFicha = !previstaEnFicha;
  // Bloquea `bloqueado` (lo decide el panel) o un request en vuelo. La ficha
  // nunca bloquea: puede estar incompleta y el responsable igual tiene que poder
  // entregar.
  const deshabilitado = bloqueado || pendiente;
  const title = bloqueado
    ? motivoBloqueo
    : fueraDeFicha
      ? `${deportistaNombre} no tiene ${label.toLowerCase()} en su ficha. Se puede registrar igual.`
      : undefined;

  // El `opacity-60` del bloqueo deja el texto en ~2.4:1, debajo del mínimo AA
  // (4.5:1). Se acepta cuando el bloqueo es transitorio y no hay nada que leer
  // (falta elegir el lugar, falta asignarlo): atenuar comunica "todavía no".
  // En solo lectura es al revés — el rastro de supervisión de un día pasado es
  // justo lo que el admin vino a leer, y el estado no se va a resolver. Queda el
  // `cursor-not-allowed`, y el botón sigue `disabled` + `aria-disabled` igual.
  const atenuado = bloqueado && !soloLectura;

  const base =
    'w-full flex flex-col items-center justify-center gap-0.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3346CC]/30';

  // Cuatro estados. El borde punteado ya no significa "no se puede" sino "no
  // está en la ficha"; el ámbar marca la entrega que se apartó de lo previsto,
  // que es exactamente el dato que después se mira en Insights.
  const estilo = marcada
    ? fueraDeFicha
      ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
      : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
    : fueraDeFicha
      ? 'border-dashed border-gray-200 bg-[#F9FAFB] text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#1C1C1C]'
      : 'border-gray-200 bg-white text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#1C1C1C]';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={marcada}
      aria-label={`${label} de ${deportistaNombre}${fueraDeFicha ? ' (fuera de su ficha)' : ''}`}
      aria-disabled={deshabilitado}
      disabled={deshabilitado}
      title={title}
      onClick={onToggle}
      className={`${base} ${estilo} ${bloqueado ? 'cursor-not-allowed' : ''} ${
        atenuado ? 'opacity-60' : ''
      }`}
    >
      <span className="flex items-center gap-1">
        {pendiente ? (
          <Loader2 size={12} className="animate-spin" aria-hidden="true" />
        ) : marcada ? (
          <Check size={12} aria-hidden="true" />
        ) : null}
        <span className="sm:hidden">{CORTO[comida]}</span>
        <span className="hidden sm:inline">{label}</span>
      </span>

      {/* El rastro de supervisión: dónde y a qué hora retiró, y quién entregó. Es
          lo que deja ver si alguien retiró en otro puesto. */}
      {entrega && (
        <span
          className={`text-[11px] font-normal leading-tight ${
            fueraDeFicha ? 'text-amber-700' : 'text-emerald-700'
          }`}
        >
          {LUGAR_RETIRO_LABELS[entrega.lugar]} · {horaEnArgentina(new Date(entrega.createdAt))}
          {entregadoPorNombre ? ` · ${entregadoPorNombre}` : ''}
        </span>
      )}
    </button>
  );
}
