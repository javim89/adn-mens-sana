import type {
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

// `Disciplina` dejó de ser un enum (ahora es modelo DB). Los labels se conservan
// como catálogo estático indexado por el `codigo` de cada disciplina.
export const DISCIPLINA_LABELS: Record<string, string> = {
  FUTBOL: 'Fútbol',
  FUTSAL: 'Futsal',
  BASQUET: 'Básquet',
  VOLEY: 'Vóley',
  HANDBALL: 'Handball',
  NATACION: 'Natación',
  ATLETISMO: 'Atletismo',
  HOCKEY: 'Hockey',
  RUGBY: 'Rugby',
  TENIS: 'Tenis',
  GIMNASIA: 'Gimnasia',
  GIMNASIA_ARTISTICA: 'Gimnasia Artística',
  PATIN: 'Patín',
  ARTES_MARCIALES: 'Artes Marciales',
  COMBATE: 'Combate',
  INICIACION_DEPORTIVA: 'Iniciación Deportiva',
  POWER_CHAIR: 'Power Chair',
  TIADE: 'TIADE',
  AJEDREZ: 'Ajedrez',
  BOXEO: 'Boxeo',
  OTRO: 'Otro',
};

export const ESTADO_LABELS: Record<EstadoDeportista, string> = {
  ACTIVO: 'Activo',
  INACTIVO: 'Inactivo',
  LESIONADO: 'Lesionado',
  SUSPENDIDO: 'Suspendido',
};

export const GENERO_LABELS: Record<Genero, string> = {
  MASCULINO: 'Masculino',
  FEMENINO: 'Femenino',
  NO_BINARIO: 'No binario',
  PREFIERO_NO_DECIR: 'Prefiero no decir',
};

export const ACTIVIDAD_COMPLEMENTARIA_LABELS: Record<ActividadComplementaria, string> = {
  GIMNASIO: 'Gimnasio',
  TECNICA_INDIVIDUAL: 'Técnica individual',
  AMBAS: 'Ambas',
  NINGUNA: 'Ninguna',
};

export const NIVEL_ESTUDIO_LABELS: Record<NivelEstudio, string> = {
  PRIMARIO_INCOMPLETO: 'Primario incompleto',
  PRIMARIO_EN_CURSO: 'Primario en curso',
  PRIMARIO_COMPLETO: 'Primario completo',
  SECUNDARIO_INCOMPLETO: 'Secundario incompleto',
  SECUNDARIO_EN_CURSO: 'Secundario en curso',
  SECUNDARIO_COMPLETO: 'Secundario completo',
  TERCIARIO_INCOMPLETO: 'Terciario incompleto',
  TERCIARIO_EN_CURSO: 'Terciario en curso',
  TERCIARIO_COMPLETO: 'Terciario completo',
};

export const SITUACION_LABORAL_LABELS: Record<SituacionLaboral, string> = {
  ALGUIEN_TRABAJA: 'Alguien trabaja',
  NADIE_TRABAJA: 'Nadie trabaja',
  SIN_DATO: 'Sin dato',
};

export const MEDIO_TRANSPORTE_LABELS: Record<MedioTransporte, string> = {
  TRANSPORTE_PUBLICO: 'Transporte público',
  TRANSPORTE_FAMILIAR: 'Transporte familiar',
  TRANSPORTE_DEL_CLUB: 'Transporte del club',
  OTRO: 'Otro',
};

export const CONDICION_VIVIENDA_LABELS: Record<CondicionVivienda, string> = {
  PROPIA: 'Propia',
  CEDIDA: 'Cedida',
  ALQUILADA: 'Alquilada',
  OTRO: 'Otro',
};

export const DIFICULTAD_ALIMENTACION_LABELS: Record<DificultadAlimentacion, string> = {
  NUNCA: 'Nunca',
  A_VECES: 'A veces',
  FRECUENTEMENTE: 'Frecuentemente',
};

export const TIPO_APOYO_LABELS: Record<TipoApoyo, string> = {
  ECONOMICO: 'Económico',
  ALIMENTACION: 'Alimentación',
  TRANSPORTE: 'Transporte',
  EDUCATIVO: 'Educativo',
  PSICOLOGICO: 'Psicológico',
  NINGUNO: 'Ninguno',
  OTRO: 'Otro',
};

export const SERVICIO_LABELS: Record<Servicio, string> = {
  LUZ: 'Luz',
  GAS: 'Gas',
  AGUA_CORRIENTE: 'Agua corriente',
  TELEFONO: 'Teléfono',
  CABLE: 'Cable',
  INTERNET: 'Internet',
  SEGURIDAD: 'Seguridad',
  ALARMA: 'Alarma',
  NINGUNA: 'Ninguno',
};

export const ENFERMEDAD_PREEXISTENTE_LABELS: Record<EnfermedadPreexistente, string> = {
  PRESION_ARTERIAL: 'Presión arterial',
  DIABETES: 'Diabetes',
  ASMA: 'Asma',
  CHAGAS: 'Chagas',
  EPILEPSIA: 'Epilepsia',
  MIGRANA: 'Migraña',
  COVID: 'Covid',
  ALERGIAS: 'Alergias',
  ETS: 'Enf. de transmisión sexual',
  OTRO: 'Otro',
};

export const ANTECEDENTE_ENFERMEDAD_FAMILIAR_LABELS: Record<AntecedenteEnfermedadFamiliar, string> = {
  DIABETES: 'Diabetes',
  EPOC: 'EPOC',
  DISLIPEMIAS: 'Dislipemias',
  HIPOTIROIDISMO: 'Hipotiroidismo',
  HIPERTIROIDISMO: 'Hipertiroidismo',
  ASMA: 'Asma',
  CANCER: 'Cáncer',
  CHAGAS: 'Chagas',
  MIGRANA: 'Migraña',
  HIPERTENSION_ARTERIAL: 'Hipertensión arterial',
  CORONARIOPATIAS: 'Coronariopatías',
  OTRO: 'Otro',
};
