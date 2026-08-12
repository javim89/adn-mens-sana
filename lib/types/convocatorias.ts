import type { EstadoEvento } from '@/lib/queries/calendario';

export interface ConvocatoriaFormData {
  eventoTorneoId: string;
  disciplinaId: string;
  categoriaId: string;
  entrenadorId?: string;
  horaCitacion?: string;
  lugar?: string;
  observaciones?: string;
  convocados: string[];
}

export interface ProximoPartido {
  eventoTorneoId: string;
  fecha: string;
  local: string;
  visitante: string;
  estado: EstadoEvento;
}

export interface DeportistaConvocable {
  id: string;
  nombre: string;
  apellido: string;
  posicion: string | null;
}
