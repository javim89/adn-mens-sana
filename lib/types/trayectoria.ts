export type TrayectoriaEventoTipo =
  | 'SEGUIMIENTO'
  | 'CONVOCATORIA'
  | 'PRESENTISMO'
  | 'TURNO'
  | 'HISTORIA';

export interface TrayectoriaEvento {
  id: string;
  tipo: TrayectoriaEventoTipo;
  fecha: string; // YYYY-MM-DD
  titulo: string;
  detalle: string | null;
  href: string | null;
  meta?: Record<string, unknown>;
}

export interface PeriodoDivision {
  id: string;
  categoriaId: string | null;
  categoriaNombre: string | null;
  disciplinaId: string | null;
  disciplinaNombre: string | null;
  desde: string; // YYYY-MM-DD
  hasta: string | null; // YYYY-MM-DD o null (período abierto)
}

export interface Trayectoria {
  periodos: PeriodoDivision[];
  eventos: TrayectoriaEvento[];
}
