import type { EstadoAsistencia, TipoSesion } from '@/lib/types/presentismo';

export const ESTADO_ASISTENCIA_LABELS: Record<EstadoAsistencia, string> = {
  PRESENTE: 'Presente',
  AUSENTE: 'Ausente',
  LLEGO_TARDE: 'Llegó tarde',
  SE_RETIRO_ANTES: 'Se retiró antes',
};

export const ESTADO_ASISTENCIA_STYLES: Record<EstadoAsistencia, string> = {
  PRESENTE: 'bg-green-100 text-green-700',
  AUSENTE: 'bg-red-100 text-red-700',
  LLEGO_TARDE: 'bg-amber-100 text-amber-700',
  SE_RETIRO_ANTES: 'bg-gray-100 text-[#6B7280]',
};

export const TIPO_SESION_LABELS: Record<TipoSesion, string> = {
  TECNICO: 'Técnico',
  TACTICO: 'Táctico',
  FISICO: 'Físico',
  MIXTO: 'Mixto',
  RECUPERACION: 'Recuperación',
};
