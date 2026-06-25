export interface TurnoFormData {
  titulo: string;
  fecha: string;
  hora: string;
  lugar: string;
  descripcion?: string;
  profesionalId: string;
  deportistaIds: string[];
}

export interface TurnoDeportistaItem {
  id: string;
  nombre: string;
  apellido: string;
}

export interface TurnoListItem {
  id: string;
  titulo: string;
  fecha: string;
  hora: string;
  lugar: string;
  descripcion: string | null;
  profesionalId: string;
  profesionalNombre: string;
  deportistas: TurnoDeportistaItem[];
}

export interface Profesional {
  id: string;
  nombre: string;
  apellido: string;
  rol: string;
}
