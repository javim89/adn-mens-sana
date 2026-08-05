export type TipoSesion = 'TECNICO' | 'TACTICO' | 'FISICO' | 'MIXTO' | 'RECUPERACION';

export type EstadoAsistencia = 'PRESENTE' | 'AUSENTE' | 'LLEGO_TARDE' | 'SE_RETIRO_ANTES';

export interface AsistenciaInput {
  deportistaId: string;
  estado: EstadoAsistencia;
  notas?: string;
}

export interface EntrenamientoFormData {
  fecha: string;
  entrenadorId?: string;
  tipoSesion: TipoSesion;
  objetivos?: string;
  disciplinaId: string;
  categoriaId: string;
  asistencias: AsistenciaInput[];
}

export interface Entrenador {
  id: string;
  nombre: string;
  apellido: string;
  rol: string;
}
