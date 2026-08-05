import {
  ESTADO_ASISTENCIA_LABELS,
  ESTADO_ASISTENCIA_STYLES,
} from '@/lib/utils/asistencia';
import type { EstadoAsistencia } from '@/lib/types/presentismo';

interface Props {
  estado: EstadoAsistencia;
  className?: string;
}

export default function EstadoAsistenciaBadge({ estado, className }: Props) {
  return (
    <span
      className={[
        'inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full',
        ESTADO_ASISTENCIA_STYLES[estado],
        className ?? '',
      ]
        .join(' ')
        .trim()}
    >
      {ESTADO_ASISTENCIA_LABELS[estado]}
    </span>
  );
}
