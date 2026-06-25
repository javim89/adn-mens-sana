import type {
  Disciplina,
  Categoria,
  EstadoDeportista,
  Genero,
  ActividadComplementaria,
  NivelEstudio,
  SituacionLaboral,
  MedioTransporte,
  CondicionVivienda,
  DificultadAlimentacion,
  TipoApoyo,
  Servicio,
  EnfermedadPreexistente,
  AntecedenteEnfermedadFamiliar,
} from '@/lib/generated/prisma/enums';
import type { Deportista } from '@/lib/generated/prisma/client';

// Tipo de entrada del formulario (estructura anidada que coincide con las tabs)
export type DeportistaFormData = {
  // Tab Personal
  apellido: string;
  nombre: string;
  dni: string;
  fechaNacimiento: string; // ISO date string del input
  provincia?: string;
  ciudad?: string;
  genero?: Genero;
  telefono?: string;
  email?: string;
  domicilioActual?: string;
  nacionalidad?: string;
  contactoEmergencia?: string;
  vivePensionClub: boolean;
  vivePensionExterna: boolean;
  observaciones?: string;

  // Tab Deportivo
  disciplina?: Disciplina;
  categoria?: Categoria;
  posicion?: string;
  estado: EstadoDeportista;
  actividadComplementaria?: ActividadComplementaria;
  fechaIngreso?: string;
  esRepresentante: boolean;
  clubesAnteriores: Array<{ nombre: string; periodo?: string }>;

  // Tab Escolar
  datosEscolares?: {
    nivelEstudio?: NivelEstudio;
    nombreColegio?: string;
    anoCursa?: number;
    materiasAdeudadas?: string;
  };

  // Tab Social
  datosFamiliares?: {
    padreNombre?: string;
    padreApellido?: string;
    padreNacionalidad?: string;
    padreOcupacion?: string;
    madreNombre?: string;
    madreApellido?: string;
    madreNacionalidad?: string;
    madreOcupacion?: string;
  };
  datosSociales?: {
    trabaja?: boolean;
    situacionLaboralHogar?: SituacionLaboral;
    conQuienVive?: string;
    composicionGrupoFamiliar?: string;
  };
  viviendaFamiliar?: {
    personasDependientes?: number;
    medioTransporte?: MedioTransporte;
    condicionVivienda?: CondicionVivienda;
    cuentaConHabitaciones?: boolean;
    servicios: Servicio[];
  };
  necesidadesApoyo?: {
    dificultadAlimentacion?: DificultadAlimentacion;
    recibeVianda: boolean;
    esSocio: boolean;
    apoyosRequeridos: TipoApoyo[];
  };

  // Tab Salud
  datosSalud?: {
    grupoSanguineo?: string;
    horasSuenio?: string;
    obraSocial?: string;
    enfermedadesPreexistentes: EnfermedadPreexistente[];
    antecedentesEnfermedadesFam: AntecedenteEnfermedadFamiliar[];
    antecedenteMuerteSubitaFamiliar?: boolean;
    antecedentesQuirurgicos?: string;
    medicacionCronica?: string;
    historialLesiones?: string;
  };
};

// Tipo para la fila de la tabla (proyección parcial)
export type DeportistaListItem = Pick<
  Deportista,
  'id' | 'nombre' | 'apellido' | 'dni' | 'disciplina' | 'categoria' | 'estado' | 'fechaIngreso'
>;

// Tipo con todas las relaciones incluidas (para detalle y edición)
export type DeportistaWithRelations = Deportista & {
  clubesAnteriores: Array<{ id: string; nombre: string; periodo?: string | null }>;
  historiaDeportiva: Array<{ id: string; descripcion: string; fecha: Date }>;
  datosEscolares: {
    id: string;
    nivelEstudio?: NivelEstudio | null;
    nombreColegio?: string | null;
    anoCursa?: number | null;
    materiasAdeudadas?: string | null;
  } | null;
  datosSociales: {
    id: string;
    trabaja?: boolean | null;
    situacionLaboralHogar?: SituacionLaboral | null;
    conQuienVive?: string | null;
    composicionGrupoFamiliar?: string | null;
  } | null;
  viviendaFamiliar: ({
    id: string;
    personasDependientes?: number | null;
    medioTransporte?: MedioTransporte | null;
    condicionVivienda?: CondicionVivienda | null;
    cuentaConHabitaciones?: boolean | null;
    servicios: Array<{ id: string; servicio: Servicio }>;
  }) | null;
  datosFamiliares: {
    id: string;
    padreNombre?: string | null;
    padreApellido?: string | null;
    padreNacionalidad?: string | null;
    padreOcupacion?: string | null;
    madreNombre?: string | null;
    madreApellido?: string | null;
    madreNacionalidad?: string | null;
    madreOcupacion?: string | null;
  } | null;
  necesidadesApoyo: ({
    id: string;
    dificultadAlimentacion?: DificultadAlimentacion | null;
    recibeVianda: boolean;
    esSocio: boolean;
    apoyosRequeridos: Array<{ id: string; tipo: TipoApoyo }>;
  }) | null;
  datosSalud: ({
    id: string;
    grupoSanguineo: string | null;
    horasSuenio: string | null;
    obraSocial: string | null;
    antecedenteMuerteSubitaFamiliar: boolean | null;
    antecedentesQuirurgicos: string | null;
    medicacionCronica: string | null;
    historialLesiones: string | null;
    enfermedadesPreexistentes: Array<{ id: string; enfermedad: EnfermedadPreexistente }>;
    antecedentesEnfermedadesFam: Array<{ id: string; antecedente: AntecedenteEnfermedadFamiliar }>;
  }) | null;
};
