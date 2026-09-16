/**
 * Capa semántica de Insights — la allowlist del módulo.
 *
 * Nada que no esté declarado acá puede llegar al SQL. Todas las expresiones
 * `sql` son literales de código de este archivo; el compilador solo resuelve
 * ids contra el catálogo y jamás concatena input del usuario.
 *
 * Los nombres de tabla y columna son los FÍSICOS (snake_case) del schema, no
 * los de Prisma. El alias de cada tabla es su propio nombre físico.
 *
 * Fan-out: un dataset solo joinea relaciones 1:1 o N:1 en su camino base. Las
 * relaciones N:M viven en un dataset propio con su granularidad declarada, y
 * las medidas que cuentan entidades usan COUNT(DISTINCT …).
 */

import {
  ESTADO_LABELS,
  GENERO_LABELS,
  ACTIVIDAD_COMPLEMENTARIA_LABELS,
  NIVEL_ESTUDIO_LABELS,
  SITUACION_LABORAL_LABELS,
  MEDIO_TRANSPORTE_LABELS,
  CONDICION_VIVIENDA_LABELS,
  DIFICULTAD_ALIMENTACION_LABELS,
  NIVEL_TRIAGE_LABELS,
  ESTADO_EVENTO_LABELS,
} from '@/lib/utils/enum-labels';
import { PRIORIDAD_LABELS, TIPO_SEGUIMIENTO_META } from '@/lib/utils/seguimiento-tipo';
import {
  ESTADO_ASISTENCIA_LABELS,
  TIPO_SESION_LABELS,
} from '@/lib/utils/asistencia';
import type { Dataset, Dimension, Measure } from './types';

const TIPO_SEGUIMIENTO_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(TIPO_SEGUIMIENTO_META).map(([k, v]) => [k, v.label]),
);

// ---------------------------------------------------------------------------
// Expresiones reutilizadas
// ---------------------------------------------------------------------------

const EDAD_SQL = "date_part('year', age(deportistas.fecha_nacimiento))";

const RANGO_ETARIO_SQL = `CASE
    WHEN deportistas.fecha_nacimiento IS NULL THEN NULL
    WHEN ${EDAD_SQL} < 12 THEN '<12'
    WHEN ${EDAD_SQL} < 15 THEN '12-14'
    WHEN ${EDAD_SQL} < 18 THEN '15-17'
    WHEN ${EDAD_SQL} < 21 THEN '18-20'
    WHEN ${EDAD_SQL} < 30 THEN '21-29'
    ELSE '30+'
  END`;

const NOMBRE_DEPORTISTA_SQL = "(deportistas.apellido || ', ' || deportistas.nombre)";

// Joins que cuelgan de `deportistas` y se repiten en varios datasets.
const JOIN_DISCIPLINA_DE_DEPORTISTA =
  'LEFT JOIN disciplinas ON disciplinas.id = deportistas.disciplina_id';
const JOIN_CATEGORIA_DE_DEPORTISTA =
  'LEFT JOIN categorias ON categorias.id = deportistas.categoria_id';

const DIM_DISCIPLINA: Dimension = {
  id: 'disciplina',
  label: 'Disciplina',
  sql: 'disciplinas.nombre',
  type: 'string',
};

const DIM_CATEGORIA: Dimension = {
  id: 'categoria',
  label: 'Categoría',
  sql: 'categorias.nombre',
  type: 'string',
};

const DIM_DEPORTISTA: Dimension = {
  id: 'deportista',
  label: 'Deportista',
  sql: NOMBRE_DEPORTISTA_SQL,
  type: 'string',
};

const DIM_GENERO: Dimension = {
  id: 'genero',
  label: 'Género',
  sql: 'deportistas.genero',
  type: 'enum',
  enumLabels: GENERO_LABELS,
};

const DIM_ESTADO_DEPORTISTA: Dimension = {
  id: 'estado_deportista',
  label: 'Estado del deportista',
  sql: 'deportistas.estado',
  type: 'enum',
  enumLabels: ESTADO_LABELS,
};

function avgMeasure(id: string, label: string, sql: string): Measure {
  return { id, label, agg: 'avg', sql, format: 'decimal' };
}

// ---------------------------------------------------------------------------
// Datasets
// ---------------------------------------------------------------------------

const deportistas: Dataset = {
  id: 'deportistas',
  label: 'Deportistas',
  description:
    'Ficha completa del deportista: datos deportivos, escolares, sociales, vivienda, apoyos y salud.',
  grain: '1 fila = 1 deportista',
  from: 'deportistas',
  joins: [
    JOIN_DISCIPLINA_DE_DEPORTISTA,
    JOIN_CATEGORIA_DE_DEPORTISTA,
    'LEFT JOIN datos_escolares ON datos_escolares.deportista_id = deportistas.id',
    'LEFT JOIN datos_sociales ON datos_sociales.deportista_id = deportistas.id',
    'LEFT JOIN vivienda_familiar ON vivienda_familiar.deportista_id = deportistas.id',
    'LEFT JOIN necesidades_apoyo ON necesidades_apoyo.deportista_id = deportistas.id',
    'LEFT JOIN datos_salud ON datos_salud.deportista_id = deportistas.id',
  ],
  dimensions: [
    DIM_DISCIPLINA,
    DIM_CATEGORIA,
    {
      id: 'estado',
      label: 'Estado',
      sql: 'deportistas.estado',
      type: 'enum',
      enumLabels: ESTADO_LABELS,
    },
    DIM_GENERO,
    { id: 'provincia', label: 'Provincia', sql: 'deportistas.provincia', type: 'string' },
    { id: 'ciudad', label: 'Ciudad', sql: 'deportistas.ciudad', type: 'string' },
    {
      id: 'nacionalidad',
      label: 'Nacionalidad',
      sql: 'deportistas.nacionalidad',
      type: 'string',
    },
    { id: 'posicion', label: 'Posición', sql: 'deportistas.posicion', type: 'string' },
    {
      id: 'actividad_complementaria',
      label: 'Actividad complementaria',
      sql: 'deportistas.actividad_complementaria',
      type: 'enum',
      enumLabels: ACTIVIDAD_COMPLEMENTARIA_LABELS,
    },
    {
      id: 'tiene_representante',
      label: 'Tiene representante',
      sql: 'deportistas.tiene_representante',
      type: 'boolean',
    },
    {
      id: 'vive_pension_club',
      label: 'Vive en pensión del club',
      sql: 'deportistas.vive_pension_club',
      type: 'boolean',
    },
    {
      id: 'vive_pension_externa',
      label: 'Vive en pensión externa',
      sql: 'deportistas.vive_pension_externa',
      type: 'boolean',
    },
    {
      id: 'rango_etario',
      label: 'Rango etario',
      sql: RANGO_ETARIO_SQL,
      type: 'string',
    },
    {
      id: 'nivel_estudio',
      label: 'Nivel de estudio',
      sql: 'datos_escolares.nivel_estudio',
      type: 'enum',
      enumLabels: NIVEL_ESTUDIO_LABELS,
    },
    {
      id: 'situacion_laboral_hogar',
      label: 'Situación laboral del hogar',
      sql: 'datos_sociales.situacion_laboral_hogar',
      type: 'enum',
      enumLabels: SITUACION_LABORAL_LABELS,
    },
    {
      id: 'condicion_vivienda',
      label: 'Condición de vivienda',
      sql: 'vivienda_familiar.condicion_vivienda',
      type: 'enum',
      enumLabels: CONDICION_VIVIENDA_LABELS,
    },
    {
      id: 'medio_transporte',
      label: 'Medio de transporte',
      sql: 'vivienda_familiar.medio_transporte',
      type: 'enum',
      enumLabels: MEDIO_TRANSPORTE_LABELS,
    },
    {
      id: 'recibe_vianda',
      label: 'Recibe vianda',
      sql: 'necesidades_apoyo.recibe_vianda',
      type: 'boolean',
    },
    {
      id: 'es_socio',
      label: 'Es socio',
      sql: 'necesidades_apoyo.es_socio',
      type: 'boolean',
    },
    {
      id: 'dificultad_alimentacion',
      label: 'Dificultad de alimentación',
      sql: 'necesidades_apoyo.dificultad_alimentacion',
      type: 'enum',
      enumLabels: DIFICULTAD_ALIMENTACION_LABELS,
    },
    {
      id: 'obra_social',
      label: 'Obra social',
      sql: 'datos_salud.obra_social',
      type: 'string',
    },
    {
      id: 'fecha_nacimiento',
      label: 'Fecha de nacimiento',
      sql: 'deportistas.fecha_nacimiento',
      type: 'date',
    },
    {
      id: 'fecha_ingreso',
      label: 'Fecha de ingreso',
      sql: 'deportistas.fecha_ingreso',
      type: 'date',
    },
    {
      id: 'created_at',
      label: 'Fecha de alta',
      sql: 'deportistas.created_at',
      type: 'date',
    },
  ],
  measures: [
    { id: 'cantidad', label: 'Cantidad', agg: 'count', sql: '*', format: 'integer' },
    { id: 'edad_promedio', label: 'Edad promedio', agg: 'avg', sql: EDAD_SQL, format: 'decimal' },
    avgMeasure(
      'personas_dependientes_promedio',
      'Personas dependientes (prom.)',
      'vivienda_familiar.personas_dependientes',
    ),
  ],
};

const seguimientos: Dataset = {
  id: 'seguimientos',
  label: 'Seguimientos',
  description:
    'Seguimientos profesionales (médicos, psicológicos, nutricionales) y los deportistas alcanzados.',
  grain: '1 fila = 1 par seguimiento × deportista',
  from: 'seguimientos',
  joins: [
    'LEFT JOIN seguimiento_deportistas ON seguimiento_deportistas.seguimiento_id = seguimientos.id',
    'LEFT JOIN deportistas ON deportistas.id = seguimiento_deportistas.deportista_id',
    JOIN_DISCIPLINA_DE_DEPORTISTA,
    JOIN_CATEGORIA_DE_DEPORTISTA,
  ],
  dimensions: [
    {
      id: 'tipo_seguimiento',
      label: 'Tipo de seguimiento',
      sql: 'seguimientos.tipo_seguimiento',
      type: 'enum',
      enumLabels: TIPO_SEGUIMIENTO_LABELS,
    },
    {
      id: 'prioridad',
      label: 'Prioridad',
      sql: 'seguimientos.prioridad',
      type: 'enum',
      enumLabels: PRIORIDAD_LABELS,
    },
    { id: 'fecha', label: 'Fecha', sql: 'seguimientos.fecha', type: 'date' },
    {
      id: 'profesional_id',
      label: 'Profesional (id)',
      sql: 'seguimientos.profesional_id',
      type: 'string',
    },
    DIM_DISCIPLINA,
    DIM_CATEGORIA,
    DIM_DEPORTISTA,
    DIM_ESTADO_DEPORTISTA,
  ],
  measures: [
    {
      id: 'seguimientos',
      label: 'Seguimientos',
      agg: 'count_distinct',
      sql: 'seguimientos.id',
      format: 'integer',
    },
    {
      id: 'deportistas_alcanzados',
      label: 'Deportistas alcanzados',
      agg: 'count_distinct',
      sql: 'seguimiento_deportistas.deportista_id',
      format: 'integer',
    },
  ],
};

const presentismo: Dataset = {
  id: 'presentismo',
  label: 'Presentismo',
  description: 'Asistencia de los deportistas a los entrenamientos registrados.',
  grain: '1 fila = 1 asistencia (deportista × entrenamiento)',
  from: 'asistencias',
  joins: [
    'LEFT JOIN entrenamientos ON entrenamientos.id = asistencias.entrenamiento_id',
    'LEFT JOIN disciplinas ON disciplinas.id = entrenamientos.disciplina_id',
    'LEFT JOIN categorias ON categorias.id = entrenamientos.categoria_id',
    'LEFT JOIN deportistas ON deportistas.id = asistencias.deportista_id',
  ],
  dimensions: [
    {
      id: 'estado',
      label: 'Estado de asistencia',
      sql: 'asistencias.estado',
      type: 'enum',
      enumLabels: ESTADO_ASISTENCIA_LABELS,
    },
    {
      id: 'tipo_sesion',
      label: 'Tipo de sesión',
      sql: 'entrenamientos.tipo_sesion',
      type: 'enum',
      enumLabels: TIPO_SESION_LABELS,
    },
    { id: 'fecha', label: 'Fecha', sql: 'entrenamientos.fecha', type: 'date' },
    DIM_DISCIPLINA,
    DIM_CATEGORIA,
    DIM_DEPORTISTA,
    {
      id: 'entrenador_id',
      label: 'Entrenador (id)',
      sql: 'entrenamientos.entrenador_id',
      type: 'string',
    },
  ],
  measures: [
    { id: 'registros', label: 'Registros', agg: 'count', sql: '*', format: 'integer' },
    {
      id: 'presentes',
      label: 'Presentes',
      agg: 'count',
      sql: '*',
      filterSql: "asistencias.estado = 'PRESENTE'",
      format: 'integer',
    },
    {
      id: 'ausentes',
      label: 'Ausentes',
      agg: 'count',
      sql: '*',
      filterSql: "asistencias.estado = 'AUSENTE'",
      format: 'integer',
    },
    {
      id: 'tardes',
      label: 'Llegadas tarde',
      agg: 'count',
      sql: '*',
      filterSql: "asistencias.estado = 'LLEGO_TARDE'",
      format: 'integer',
    },
    {
      id: 'entrenamientos',
      label: 'Entrenamientos',
      agg: 'count_distinct',
      sql: 'asistencias.entrenamiento_id',
      format: 'integer',
    },
    {
      id: 'porcentaje_presentismo',
      label: '% de presentismo',
      formula: 'presentes / registros * 100',
      operands: ['presentes', 'registros'],
      format: 'percent',
    },
  ],
};

const antropometria: Dataset = {
  id: 'antropometria',
  label: 'Antropometría',
  description: 'Mediciones antropométricas registradas dentro de un seguimiento.',
  grain: '1 fila = 1 medición × deportista',
  from: 'seguimientos_antropometria',
  joins: [
    'LEFT JOIN seguimientos ON seguimientos.id = seguimientos_antropometria.seguimiento_id',
    'LEFT JOIN seguimiento_deportistas ON seguimiento_deportistas.seguimiento_id = seguimientos.id',
    'LEFT JOIN deportistas ON deportistas.id = seguimiento_deportistas.deportista_id',
    JOIN_DISCIPLINA_DE_DEPORTISTA,
    JOIN_CATEGORIA_DE_DEPORTISTA,
  ],
  dimensions: [
    { id: 'fecha', label: 'Fecha', sql: 'seguimientos.fecha', type: 'date' },
    DIM_DISCIPLINA,
    DIM_CATEGORIA,
    DIM_DEPORTISTA,
    DIM_GENERO,
  ],
  measures: [
    {
      id: 'mediciones',
      label: 'Mediciones',
      agg: 'count_distinct',
      sql: 'seguimientos_antropometria.id',
      format: 'integer',
    },
    avgMeasure('peso_promedio', 'Peso (prom.)', 'seguimientos_antropometria.peso'),
    { id: 'peso_min', label: 'Peso (mín.)', agg: 'min', sql: 'seguimientos_antropometria.peso', format: 'decimal' },
    { id: 'peso_max', label: 'Peso (máx.)', agg: 'max', sql: 'seguimientos_antropometria.peso', format: 'decimal' },
    avgMeasure('talla_promedio', 'Talla (prom.)', 'seguimientos_antropometria.talla'),
    { id: 'talla_min', label: 'Talla (mín.)', agg: 'min', sql: 'seguimientos_antropometria.talla', format: 'decimal' },
    { id: 'talla_max', label: 'Talla (máx.)', agg: 'max', sql: 'seguimientos_antropometria.talla', format: 'decimal' },
    avgMeasure('imc_promedio', 'IMC (prom.)', 'seguimientos_antropometria.imc'),
    { id: 'imc_min', label: 'IMC (mín.)', agg: 'min', sql: 'seguimientos_antropometria.imc', format: 'decimal' },
    { id: 'imc_max', label: 'IMC (máx.)', agg: 'max', sql: 'seguimientos_antropometria.imc', format: 'decimal' },
    avgMeasure(
      'sumatoria_pliegues_promedio',
      'Sumatoria de pliegues (prom.)',
      'seguimientos_antropometria.sumatoria_pliegues',
    ),
    {
      id: 'sumatoria_pliegues_min',
      label: 'Sumatoria de pliegues (mín.)',
      agg: 'min',
      sql: 'seguimientos_antropometria.sumatoria_pliegues',
      format: 'decimal',
    },
    {
      id: 'sumatoria_pliegues_max',
      label: 'Sumatoria de pliegues (máx.)',
      agg: 'max',
      sql: 'seguimientos_antropometria.sumatoria_pliegues',
      format: 'decimal',
    },
    avgMeasure('tsen_promedio', 'TSEN (prom.)', 'seguimientos_antropometria.tsen'),
    avgMeasure(
      'perimetro_brazo_promedio',
      'Perímetro de brazo (prom.)',
      'seguimientos_antropometria.perimetro_brazo',
    ),
    avgMeasure(
      'perimetro_muslo_medio_promedio',
      'Perímetro de muslo medio (prom.)',
      'seguimientos_antropometria.perimetro_muslo_medio',
    ),
    avgMeasure(
      'perimetro_pantorrilla_promedio',
      'Perímetro de pantorrilla (prom.)',
      'seguimientos_antropometria.perimetro_pantorrilla',
    ),
    avgMeasure(
      'cintura_minima_promedio',
      'Cintura mínima (prom.)',
      'seguimientos_antropometria.cintura_minima',
    ),
    avgMeasure(
      'cadera_maxima_promedio',
      'Cadera máxima (prom.)',
      'seguimientos_antropometria.cadera_maxima',
    ),
    avgMeasure(
      'pliegue_triceps_promedio',
      'Pliegue tríceps (prom.)',
      'seguimientos_antropometria.pliegue_triceps',
    ),
    avgMeasure(
      'pliegue_subescapular_promedio',
      'Pliegue subescapular (prom.)',
      'seguimientos_antropometria.pliegue_subescapular',
    ),
    avgMeasure(
      'pliegue_supraespinal_promedio',
      'Pliegue supraespinal (prom.)',
      'seguimientos_antropometria.pliegue_supraespinal',
    ),
    avgMeasure(
      'pliegue_abdominal_promedio',
      'Pliegue abdominal (prom.)',
      'seguimientos_antropometria.pliegue_abdominal',
    ),
    avgMeasure(
      'pliegue_muslo_promedio',
      'Pliegue muslo (prom.)',
      'seguimientos_antropometria.pliegue_muslo',
    ),
    avgMeasure(
      'pliegue_pantorrilla_promedio',
      'Pliegue pantorrilla (prom.)',
      'seguimientos_antropometria.pliegue_pantorrilla',
    ),
  ],
};

const evaluacionPsicologica: Dataset = {
  id: 'evaluacion_psicologica',
  label: 'Evaluación psicológica',
  description: 'Resultados de los cuestionarios CPRD y STAI cargados en un seguimiento.',
  grain: '1 fila = 1 evaluación × deportista',
  from: 'seguimientos_evaluacion_psicologica',
  joins: [
    'LEFT JOIN seguimientos ON seguimientos.id = seguimientos_evaluacion_psicologica.seguimiento_id',
    'LEFT JOIN seguimiento_deportistas ON seguimiento_deportistas.seguimiento_id = seguimientos.id',
    'LEFT JOIN deportistas ON deportistas.id = seguimiento_deportistas.deportista_id',
    JOIN_DISCIPLINA_DE_DEPORTISTA,
    JOIN_CATEGORIA_DE_DEPORTISTA,
  ],
  dimensions: [
    { id: 'fecha', label: 'Fecha', sql: 'seguimientos.fecha', type: 'date' },
    DIM_DISCIPLINA,
    DIM_CATEGORIA,
    DIM_DEPORTISTA,
  ],
  measures: [
    {
      id: 'evaluaciones',
      label: 'Evaluaciones',
      agg: 'count_distinct',
      sql: 'seguimientos_evaluacion_psicologica.id',
      format: 'integer',
    },
    avgMeasure(
      'cprd_control_estres_promedio',
      'CPRD control del estrés (prom.)',
      'seguimientos_evaluacion_psicologica.cprd_control_estres',
    ),
    avgMeasure(
      'cprd_influencia_evaluacion_promedio',
      'CPRD influencia de la evaluación (prom.)',
      'seguimientos_evaluacion_psicologica.cprd_influencia_evaluacion',
    ),
    avgMeasure(
      'cprd_motivacion_promedio',
      'CPRD motivación (prom.)',
      'seguimientos_evaluacion_psicologica.cprd_motivacion',
    ),
    avgMeasure(
      'cprd_habilidad_mental_promedio',
      'CPRD habilidad mental (prom.)',
      'seguimientos_evaluacion_psicologica.cprd_habilidad_mental',
    ),
    avgMeasure(
      'cprd_cohesion_equipo_promedio',
      'CPRD cohesión de equipo (prom.)',
      'seguimientos_evaluacion_psicologica.cprd_cohesion_equipo',
    ),
    avgMeasure(
      'stai_rasgo_promedio',
      'STAI rasgo (prom.)',
      'seguimientos_evaluacion_psicologica.stai_rasgo',
    ),
    avgMeasure(
      'stai_estado_promedio',
      'STAI estado (prom.)',
      'seguimientos_evaluacion_psicologica.stai_estado',
    ),
  ],
};

const turnos: Dataset = {
  id: 'turnos',
  label: 'Turnos',
  description: 'Turnos agendados por los profesionales y los deportistas citados.',
  grain: '1 fila = 1 turno × deportista',
  from: 'turnos',
  joins: [
    'LEFT JOIN turno_deportistas ON turno_deportistas.turno_id = turnos.id',
    'LEFT JOIN deportistas ON deportistas.id = turno_deportistas.deportista_id',
    JOIN_DISCIPLINA_DE_DEPORTISTA,
    JOIN_CATEGORIA_DE_DEPORTISTA,
  ],
  dimensions: [
    { id: 'fecha', label: 'Fecha', sql: 'turnos.fecha', type: 'date' },
    { id: 'lugar', label: 'Lugar', sql: 'turnos.lugar', type: 'string' },
    {
      id: 'profesional_id',
      label: 'Profesional (id)',
      sql: 'turnos.profesional_id',
      type: 'string',
    },
    DIM_DISCIPLINA,
    DIM_CATEGORIA,
    DIM_DEPORTISTA,
  ],
  measures: [
    {
      id: 'turnos',
      label: 'Turnos',
      agg: 'count_distinct',
      sql: 'turnos.id',
      format: 'integer',
    },
    {
      id: 'deportistas_citados',
      label: 'Deportistas citados',
      agg: 'count_distinct',
      sql: 'turno_deportistas.deportista_id',
      format: 'integer',
    },
  ],
};

const convocatorias: Dataset = {
  id: 'convocatorias',
  label: 'Convocatorias',
  description: 'Deportistas convocados a cada evento del calendario de torneo.',
  grain: '1 fila = 1 convocado (deportista × convocatoria)',
  from: 'convocatoria_deportistas',
  joins: [
    'LEFT JOIN convocatorias ON convocatorias.id = convocatoria_deportistas.convocatoria_id',
    'LEFT JOIN disciplinas ON disciplinas.id = convocatorias.disciplina_id',
    'LEFT JOIN categorias ON categorias.id = convocatorias.categoria_id',
    'LEFT JOIN eventos_torneo ON eventos_torneo.id = convocatorias.evento_torneo_id',
    'LEFT JOIN dias_calendario ON dias_calendario.id = eventos_torneo.dia_calendario_id',
    'LEFT JOIN deportistas ON deportistas.id = convocatoria_deportistas.deportista_id',
  ],
  dimensions: [
    {
      id: 'fecha_evento',
      label: 'Fecha del evento',
      sql: 'dias_calendario.fecha',
      type: 'date',
    },
    DIM_DISCIPLINA,
    DIM_CATEGORIA,
    { id: 'lugar', label: 'Lugar', sql: 'convocatorias.lugar', type: 'string' },
    {
      id: 'estado_evento',
      label: 'Estado del evento',
      sql: 'eventos_torneo.estado',
      type: 'enum',
      enumLabels: ESTADO_EVENTO_LABELS,
    },
    DIM_DEPORTISTA,
    {
      id: 'entrenador_id',
      label: 'Entrenador (id)',
      sql: 'convocatorias.entrenador_id',
      type: 'string',
    },
  ],
  measures: [
    { id: 'convocados', label: 'Convocados', agg: 'count', sql: '*', format: 'integer' },
    {
      id: 'convocatorias',
      label: 'Convocatorias',
      agg: 'count_distinct',
      sql: 'convocatoria_deportistas.convocatoria_id',
      format: 'integer',
    },
    {
      id: 'deportistas_distintos',
      label: 'Deportistas distintos',
      agg: 'count_distinct',
      sql: 'convocatoria_deportistas.deportista_id',
      format: 'integer',
    },
  ],
};

// El triage se parte en dos datasets a propósito: "¿cuántos están en rojo hoy?"
// y "¿cómo evolucionó el riesgo?" son preguntas distintas, y mezclarlas produce
// números mal leídos.
const triageUltimo: Dataset = {
  id: 'triage_ultimo',
  label: 'Triage (último)',
  description: 'Triage vigente de cada deportista — el snapshot más reciente.',
  grain: '1 fila = 1 deportista (su triage vigente)',
  cte: `WITH triage_ultimo AS (
    SELECT DISTINCT ON (triage.deportista_id)
      triage.deportista_id,
      triage.nivel,
      triage.puntaje_total,
      triage.calculated_at
    FROM triage
    ORDER BY triage.deportista_id, triage.calculated_at DESC
  )`,
  from: 'triage_ultimo',
  joins: [
    'LEFT JOIN deportistas ON deportistas.id = triage_ultimo.deportista_id',
    JOIN_DISCIPLINA_DE_DEPORTISTA,
    JOIN_CATEGORIA_DE_DEPORTISTA,
  ],
  dimensions: [
    {
      id: 'nivel',
      label: 'Nivel de triage',
      sql: 'triage_ultimo.nivel',
      type: 'enum',
      enumLabels: NIVEL_TRIAGE_LABELS,
    },
    DIM_DISCIPLINA,
    DIM_CATEGORIA,
    DIM_ESTADO_DEPORTISTA,
    DIM_GENERO,
    {
      id: 'calculated_at',
      label: 'Calculado el',
      sql: 'triage_ultimo.calculated_at',
      type: 'date',
    },
  ],
  measures: [
    { id: 'deportistas', label: 'Deportistas', agg: 'count', sql: '*', format: 'integer' },
    {
      id: 'puntaje_promedio',
      label: 'Puntaje promedio',
      agg: 'avg',
      sql: 'triage_ultimo.puntaje_total',
      format: 'decimal',
    },
    {
      id: 'puntaje_maximo',
      label: 'Puntaje máximo',
      agg: 'max',
      sql: 'triage_ultimo.puntaje_total',
      format: 'integer',
    },
  ],
};

const triageHistorico: Dataset = {
  id: 'triage_historico',
  label: 'Triage (histórico)',
  description: 'Serie completa de snapshots de triage, para ver la evolución del riesgo.',
  grain: '1 fila = 1 snapshot de triage',
  from: 'triage',
  joins: [
    'LEFT JOIN deportistas ON deportistas.id = triage.deportista_id',
    JOIN_DISCIPLINA_DE_DEPORTISTA,
    JOIN_CATEGORIA_DE_DEPORTISTA,
  ],
  dimensions: [
    {
      id: 'nivel',
      label: 'Nivel de triage',
      sql: 'triage.nivel',
      type: 'enum',
      enumLabels: NIVEL_TRIAGE_LABELS,
    },
    {
      id: 'calculated_at',
      label: 'Calculado el',
      sql: 'triage.calculated_at',
      type: 'date',
    },
    DIM_DISCIPLINA,
    DIM_CATEGORIA,
    DIM_ESTADO_DEPORTISTA,
  ],
  measures: [
    { id: 'snapshots', label: 'Snapshots', agg: 'count', sql: '*', format: 'integer' },
    {
      id: 'puntaje_promedio',
      label: 'Puntaje promedio',
      agg: 'avg',
      sql: 'triage.puntaje_total',
      format: 'decimal',
    },
    {
      id: 'deportistas_distintos',
      label: 'Deportistas distintos',
      agg: 'count_distinct',
      sql: 'triage.deportista_id',
      format: 'integer',
    },
  ],
};

export const DATASETS: Dataset[] = [
  deportistas,
  seguimientos,
  presentismo,
  antropometria,
  evaluacionPsicologica,
  turnos,
  convocatorias,
  triageUltimo,
  triageHistorico,
];

export const CATALOG: Record<string, Dataset> = Object.fromEntries(
  DATASETS.map((d) => [d.id, d]),
);

export function getDataset(id: string): Dataset | undefined {
  return Object.prototype.hasOwnProperty.call(CATALOG, id) ? CATALOG[id] : undefined;
}
