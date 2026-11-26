/**
 * Los datos de ejemplo de la landing, en un solo lugar.
 *
 * **Son fijos y ficticios a propósito.** La landing es pública: no consulta la base,
 * no muestra nombres reales de deportistas ni de profesionales, y los números no
 * describen al plantel actual. Están tipados con los mismos tipos que usan los
 * componentes del dashboard para que una card de acá sea exactamente la del panel.
 */
import type { AppRole, NavItem } from '@/lib/roles';
import type { ConteoPorNivel } from '@/lib/queries/triage';
import type { Variacion } from '../(app)/dashboard/_lib/variacion';
import type { CategoriaBarra } from '../(app)/dashboard/_components/BarrasCategoria';
import type { EstadoDeportista, EstadoEvento, NivelTriage } from '@/lib/generated/prisma/enums';
import type { PrioridadSeguimiento, TipoSeguimiento } from '@/lib/types/seguimientos';
import type { ChartProps } from '../(app)/insights/_components/charts/types';
import type { EstadoAsistencia } from '@/lib/types/presentismo';

/** Distribución de triage sobre un plantel de ejemplo. */
export const TRIAGE_DEMO: {
  actual: ConteoPorNivel;
  sinCalcular: number;
  totalActivos: number;
} = {
  actual: { ROJO: 6, NARANJA: 14, AMARILLO: 31, VERDE: 121 },
  sinCalcular: 8,
  totalActivos: 180,
};

/** Presentismo semanal: KPI + variación vs. la semana anterior. */
export const PRESENTISMO_DEMO: { porcentaje: number; variacion: Variacion; detalle: string } = {
  porcentaje: 87,
  variacion: { tipo: 'delta', puntos: 4, porcentaje: 5, direccion: 'sube' },
  detalle: 'Asistencia a entrenamientos, todas las categorías.',
};

/** Presentismo por día de la semana (%). */
export const PRESENTISMO_POR_DIA: CategoriaBarra[] = [
  { clave: 'lun', label: 'Lun', valor: 82 },
  { clave: 'mar', label: 'Mar', valor: 91 },
  { clave: 'mie', label: 'Mié', valor: 88 },
  { clave: 'jue', label: 'Jue', valor: 94 },
  { clave: 'vie', label: 'Vie', valor: 79 },
];

/** Viandas entregadas por comida en la semana. */
export const VIANDAS_POR_COMIDA: CategoriaBarra[] = [
  { clave: 'desayuno', label: 'Desayuno', valor: 412 },
  { clave: 'almuerzo', label: 'Almuerzo', valor: 268 },
  { clave: 'merienda', label: 'Merienda', valor: 305 },
  { clave: 'cena', label: 'Cena', valor: 174 },
];

/** Seguimientos abiertos: el KPI destacado de la sección de seguimientos. */
export const SEGUIMIENTOS_DEMO: { abiertos: number; variacion: Variacion } = {
  abiertos: 42,
  variacion: { tipo: 'delta', puntos: -3, porcentaje: -7, direccion: 'baja' },
};

export interface TurnoDemo {
  id: string;
  dia: string;
  hora: string;
  titulo: string;
  detalle: string;
}

/** Próximos turnos, sin nombres: el detalle dice categoría y lugar. */
export const TURNOS_DEMO: TurnoDemo[] = [
  { id: 't1', dia: 'LUN 9/11', hora: '09:30', titulo: 'Kinesiología', detalle: '4ta división · Predio de entrenamiento' },
  { id: 't2', dia: 'LUN 9/11', hora: '11:00', titulo: 'Control cardiológico', detalle: 'Reserva · Sede' },
  { id: 't3', dia: 'MAR 10/11', hora: '15:00', titulo: 'Evaluación psicológica', detalle: '6ta división · Sede' },
];

/**
 * Los módulos que presenta la landing, en el orden del sidebar. Sale de
 * `ALL_NAV_ITEMS`: Dashboard y Usuarios quedan afuera (son el panel y la
 * administración, no un módulo de trabajo).
 */
export const HREF_MODULOS: NavItem['href'][] = [
  '/deportistas',
  '/seguimientos',
  '/turnos',
  '/presentismo',
  '/convocatorias',
  '/viandas',
  '/calendario',
  '/insights',
];

/** Una línea por módulo. Describe solo lo que el módulo hace hoy. */
export const DESCRIPCION_MODULO: Record<string, string> = {
  '/deportistas':
    'Ficha integral con datos personales, escolares, familiares, sociales y de salud, foto y trayectoria por divisiones.',
  '/seguimientos':
    'Historia clínica, traumatología, evaluaciones psicológicas y cardiológicas, antropometría y seguimiento social.',
  '/turnos': 'Agenda de turnos con los profesionales: fecha, hora, lugar y deportistas citados.',
  '/presentismo':
    'Asistencia por entrenamiento: presente, ausente, llegó tarde o se retiró antes.',
  '/convocatorias': 'Citación de los deportistas a cada partido del torneo, con hora y lugar.',
  '/viandas':
    'Entregas de desayuno, almuerzo, merienda y cena según las necesidades de cada deportista.',
  '/calendario': 'Días de torneo, receso y recupero, con los partidos de cada categoría.',
  '/insights': 'Tableros de análisis sobre los datos de tu club, con filtros y exportación.',
};

/** Plantel por estado, para la card de Plantel de la ventana del dashboard. */
export const PLANTEL_DEMO: { total: number; porEstado: Record<'ACTIVO' | 'LESIONADO' | 'SUSPENDIDO' | 'INACTIVO', number> } = {
  total: 212,
  porEstado: { ACTIVO: 180, LESIONADO: 9, SUSPENDIDO: 2, INACTIVO: 21 },
};

/** El rango de la semana que muestra el encabezado del dashboard de ejemplo. */
export const SEMANA_DEMO = 'del 9 al 15/11';

/**
 * Demo de Insights: presentismo de las últimas 12 semanas para el `LineChart` real.
 * Arranca en 64% porque el eje Y empieza en 0 y con valores más altos la línea queda
 * plana. El último punto (87%, +4) cierra con `PRESENTISMO_DEMO`.
 */
export const INSIGHTS_DEMO: ChartProps = {
  columns: [
    { id: 'semana', label: 'Semana', type: 'string', role: 'dimension' },
    { id: 'presentismo', label: 'Presentismo', type: 'number', role: 'measure', format: 'percent' },
  ],
  config: { type: 'line', numberFormat: 'percent', showLegend: false, showGrid: true },
  data: [
    ['24/8', 64],
    ['31/8', 69],
    ['7/9', 66],
    ['14/9', 72],
    ['21/9', 75],
    ['28/9', 71],
    ['5/10', 78],
    ['12/10', 80],
    ['19/10', 77],
    ['26/10', 83],
    ['2/11', 83],
    ['9/11', 87],
  ].map(([semana, presentismo]) => ({ semana, presentismo })),
};

/** Las categorías del filtro abierto en la demo de Insights. */
export const CATEGORIAS_FILTRO_DEMO: { label: string; marcada: boolean }[] = [
  { label: '4ta división', marcada: true },
  { label: '5ta división', marcada: false },
  { label: '6ta división', marcada: false },
  { label: 'Reserva', marcada: false },
];

export interface SeguimientoDemo {
  id: string;
  deportista: string;
  iniciales: string;
  fecha: string;
  titulo: string;
  prioridad: PrioridadSeguimiento;
  tipo: TipoSeguimiento;
}

/** El listado de la demo de Seguimientos. Nombres ficticios. */
export const SEGUIMIENTOS_LISTA_DEMO: SeguimientoDemo[] = [
  { id: 's1', deportista: 'Tomás Ferreyra', iniciales: 'TF', fecha: '10/11', titulo: 'Control post esguince de tobillo', prioridad: 'ALTA', tipo: 'TRAUMATOLOGIA' },
  { id: 's2', deportista: 'Lucía Benítez', iniciales: 'LB', fecha: '9/11', titulo: 'Entrevista inicial', prioridad: 'MEDIA', tipo: 'EVALUACION_PSICOLOGICA' },
  { id: 's3', deportista: 'Matías Godoy', iniciales: 'MG', fecha: '7/11', titulo: 'Electrocardiograma de rutina', prioridad: 'BAJA', tipo: 'EVALUACION_CARDIOLOGICA' },
  { id: 's4', deportista: 'Julián Arce', iniciales: 'JA', fecha: '5/11', titulo: 'Mediciones de pretemporada', prioridad: 'BAJA', tipo: 'ANTROPOMETRIA' },
  { id: 's5', deportista: 'Bruno Sosa', iniciales: 'BS', fecha: '3/11', titulo: 'Acompañamiento escolar y familiar', prioridad: 'URGENTE', tipo: 'GENERICO' },
  { id: 's6', deportista: 'Emilia Rojas', iniciales: 'ER', fecha: '2/11', titulo: 'Control clínico anual', prioridad: 'MEDIA', tipo: 'HISTORIA_CLINICA' },
  { id: 's7', deportista: 'Gonzalo Ríos', iniciales: 'GR', fecha: '31/10', titulo: 'Control de carga muscular', prioridad: 'BAJA', tipo: 'TRAUMATOLOGIA' },
];

/** La convocatoria de la demo: rival inventado, lugar genérico. */
export const CONVOCATORIA_DEMO = {
  rival: 'vs. Atlético Las Acacias',
  disciplina: 'Fútbol',
  categoria: '4ta división',
  condicion: 'Local',
  dia: 'SÁB 14/11',
  hora: '15:30',
  horaCitacion: '13:45',
  lugar: 'Predio de entrenamiento · Cancha 2',
  totalCitados: 18,
  confirmados: 15,
  pendientes: 3,
  citados: [
    { id: 'c1', nombre: 'Valentín Ruiz', iniciales: 'VR', posicion: 'Arquero' },
    { id: 'c2', nombre: 'Franco Medina', iniciales: 'FM', posicion: 'Defensor' },
    { id: 'c3', nombre: 'Nahuel Ortiz', iniciales: 'NO', posicion: 'Defensor' },
    { id: 'c4', nombre: 'Santiago Luna', iniciales: 'SL', posicion: 'Mediocampista' },
    { id: 'c5', nombre: 'Ezequiel Paz', iniciales: 'EP', posicion: 'Delantero' },
    { id: 'c6', nombre: 'Bautista Correa', iniciales: 'BC', posicion: 'Mediocampista' },
    { id: 'c7', nombre: 'Thiago Navarro', iniciales: 'TN', posicion: 'Delantero' },
  ],
  porPosicion: [
    { label: 'Arqueros', cantidad: 2 },
    { label: 'Defensores', cantidad: 6 },
    { label: 'Mediocampistas', cantidad: 6 },
    { label: 'Delanteros', cantidad: 4 },
  ],
} as const;

export interface DeportistaDemo {
  id: string;
  nombre: string;
  iniciales: string;
  categoria: string;
  estado: EstadoDeportista;
  triage: NivelTriage;
  /** Enmascarado a propósito: que se note que es un ejemplo. */
  dni: string;
  disciplina: string;
}

/** El listado de la demo de Deportistas. Nombres ficticios. */
export const DEPORTISTAS_DEMO: DeportistaDemo[] = [
  { id: 'd1', nombre: 'Agustín Molina', iniciales: 'AM', categoria: '4ta división', estado: 'ACTIVO', triage: 'ROJO', dni: '47.xxx.xxx', disciplina: 'Fútbol' },
  { id: 'd2', nombre: 'Ignacio Vera', iniciales: 'IV', categoria: '5ta división', estado: 'LESIONADO', triage: 'NARANJA', dni: '48.xxx.xxx', disciplina: 'Fútbol' },
  { id: 'd3', nombre: 'Ramiro Acosta', iniciales: 'RA', categoria: 'Reserva', estado: 'ACTIVO', triage: 'AMARILLO', dni: '45.xxx.xxx', disciplina: 'Fútbol' },
  { id: 'd4', nombre: 'Facundo Herrera', iniciales: 'FH', categoria: '6ta división', estado: 'ACTIVO', triage: 'VERDE', dni: '49.xxx.xxx', disciplina: 'Fútbol' },
  { id: 'd5', nombre: 'Lautaro Gómez', iniciales: 'LG', categoria: '7ma división', estado: 'SUSPENDIDO', triage: 'AMARILLO', dni: '50.xxx.xxx', disciplina: 'Fútbol' },
  { id: 'd6', nombre: 'Joaquín Blanco', iniciales: 'JB', categoria: '4ta división', estado: 'ACTIVO', triage: 'VERDE', dni: '47.xxx.xxx', disciplina: 'Fútbol' },
  { id: 'd7', nombre: 'Benjamín Ortega', iniciales: 'BO', categoria: '5ta división', estado: 'ACTIVO', triage: 'VERDE', dni: '48.xxx.xxx', disciplina: 'Fútbol' },
  { id: 'd8', nombre: 'Mateo Quiroga', iniciales: 'MQ', categoria: 'Reserva', estado: 'LESIONADO', triage: 'AMARILLO', dni: '46.xxx.xxx', disciplina: 'Fútbol' },
];

/** La ficha resumida que abre la demo de Deportistas (el primero del listado). */
export const FICHA_DEMO = {
  seguimientosAbiertos: 3,
  presentismoMes: '71%',
  proximoTurno: 'Psicología 12/11',
  escuela: 'Al día',
} as const;

/* ---------------------------------------------------------------------------
   Pantallas de las páginas de funcionalidades (`app/_landing/pantallas/`).
   Mismas reglas: fijos, ficticios, sin nombres de clubes clientes.
   --------------------------------------------------------------------------- */

/** El deportista de la ficha de ejemplo (el primero de `DEPORTISTAS_DEMO`). */
export const FICHA_DETALLE_DEMO = {
  nombre: 'Agustín Molina',
  iniciales: 'AM',
  disciplina: 'Fútbol',
  categoria: '4ta división',
  posicion: 'Mediocampista',
  estado: 'ACTIVO' as EstadoDeportista,
  triage: 'NARANJA' as NivelTriage,
  edad: '17 años',
  pestanas: ['Personal', 'Deportivo', 'Escolar', 'Social', 'Salud', 'Trayectoria'],
  salud: [
    { label: 'Grupo sanguíneo', valor: '0+' },
    { label: 'Obra social', valor: 'Sí, con cobertura' },
    { label: 'Alergias', valor: 'Ninguna conocida' },
    { label: 'Medicación habitual', valor: 'No' },
    { label: 'Apto físico', valor: 'Vigente hasta 03/2027' },
    { label: 'Antecedentes familiares', valor: 'Hipertensión' },
  ],
};

export interface PeriodoDivisionDemo {
  id: string;
  division: string;
  desde: string;
  hasta: string | null;
}

/** El recorrido por las divisiones del deportista de la ficha, del más reciente al más viejo. */
export const TRAYECTORIA_DEMO: {
  periodos: PeriodoDivisionDemo[];
  clubesAnteriores: { id: string; nombre: string; periodo: string }[];
  hitos: { id: string; fecha: string; titulo: string; detalle: string }[];
} = {
  periodos: [
    { id: 'p1', division: '4ta división', desde: '03/2026', hasta: null },
    { id: 'p2', division: '5ta división', desde: '02/2025', hasta: '02/2026' },
    { id: 'p3', division: '6ta división', desde: '02/2024', hasta: '01/2025' },
    { id: 'p4', division: '7ma división', desde: '03/2023', hasta: '01/2024' },
  ],
  clubesAnteriores: [
    { id: 'ca1', nombre: 'Escuela de fútbol del barrio', periodo: '2017 – 2022' },
  ],
  hitos: [
    { id: 'h1', fecha: '05/2026', titulo: 'Primera citación con la 4ta', detalle: 'Convocado como titular' },
    { id: 'h2', fecha: '09/2025', titulo: 'Lesión de tobillo', detalle: 'Recuperado en 5 semanas' },
  ],
};

/** El formulario de antropometría de ejemplo. El IMC sale de peso y talla. */
export const ANTROPOMETRIA_DEMO = {
  deportista: 'Julián Arce',
  iniciales: 'JA',
  fecha: '05/11/2026',
  medidas: [
    { label: 'Peso', valor: '68,4', unidad: 'kg' },
    { label: 'Talla', valor: '176', unidad: 'cm' },
    { label: 'Perímetro de brazo', valor: '29,5', unidad: 'cm' },
    { label: 'Perímetro de muslo', valor: '54,0', unidad: 'cm' },
  ],
  pliegues: [
    { label: 'Tricipital', valor: '8' },
    { label: 'Subescapular', valor: '9' },
    { label: 'Supraespinal', valor: '7' },
    { label: 'Abdominal', valor: '12' },
  ],
  imc: '22,1',
  sumatoriaPliegues: '36',
};

export interface AlertaTriageDemo {
  id: string;
  nombre: string;
  iniciales: string;
  categoria: string;
  nivel: NivelTriage;
  motivos: string[];
}

/** Los deportistas que encabezan el triage, con lo que explica su nivel. */
export const ALERTAS_TRIAGE_DEMO: AlertaTriageDemo[] = [
  { id: 'a1', nombre: 'Bruno Sosa', iniciales: 'BS', categoria: 'Reserva', nivel: 'ROJO', motivos: ['Seguimiento social urgente', '3 ausencias en la semana'] },
  { id: 'a2', nombre: 'Agustín Molina', iniciales: 'AM', categoria: '4ta división', nivel: 'ROJO', motivos: ['Evaluación psicológica alta', 'Sin citación en 3 fechas'] },
  { id: 'a3', nombre: 'Tomás Ferreyra', iniciales: 'TF', categoria: '5ta división', nivel: 'NARANJA', motivos: ['Traumatología alta'] },
  { id: 'a4', nombre: 'Ignacio Vera', iniciales: 'IV', categoria: '5ta división', nivel: 'NARANJA', motivos: ['Lesionado', '2 ausencias en la semana'] },
  { id: 'a5', nombre: 'Mateo Quiroga', iniciales: 'MQ', categoria: 'Reserva', nivel: 'AMARILLO', motivos: ['Control cardiológico pendiente'] },
];

export interface TurnoAgendaDemo {
  id: string;
  dia: string;
  hora: string;
  titulo: string;
  lugar: string;
  profesional: string;
  area: string;
  deportistas: string;
}

/** La agenda de turnos de la semana. Profesionales y deportistas ficticios. */
export const AGENDA_TURNOS_DEMO: TurnoAgendaDemo[] = [
  { id: 'ta1', dia: 'LUN 9/11', hora: '09:30', titulo: 'Kinesiología', lugar: 'Predio', profesional: 'Lic. Carla Méndez', area: 'Kinesiología', deportistas: 'Tomás Ferreyra' },
  { id: 'ta2', dia: 'LUN 9/11', hora: '11:00', titulo: 'Control cardiológico', lugar: 'Sede', profesional: 'Dr. Pablo Ibáñez', area: 'Cardiología', deportistas: 'Mateo Quiroga' },
  { id: 'ta3', dia: 'MAR 10/11', hora: '15:00', titulo: 'Evaluación psicológica', lugar: 'Sede', profesional: 'Lic. Sofía Paredes', area: 'Psicología', deportistas: 'Agustín Molina' },
  { id: 'ta4', dia: 'MIÉ 11/11', hora: '10:00', titulo: 'Mediciones antropométricas', lugar: 'Predio', profesional: 'Lic. Martín Duarte', area: 'Nutrición', deportistas: '6ta división (12)' },
  { id: 'ta5', dia: 'JUE 12/11', hora: '09:30', titulo: 'Kinesiología', lugar: 'Predio', profesional: 'Lic. Carla Méndez', area: 'Kinesiología', deportistas: 'Ignacio Vera' },
  { id: 'ta6', dia: 'JUE 12/11', hora: '16:30', titulo: 'Charla grupal', lugar: 'Sede', profesional: 'Lic. Sofía Paredes', area: 'Psicología', deportistas: 'Reserva (22)' },
];

export interface AsistenciaDemo {
  id: string;
  nombre: string;
  iniciales: string;
  estado: EstadoAsistencia;
  nota?: string;
}

/** La toma de asistencia de un entrenamiento de la 4ta. */
export const TOMA_ASISTENCIA_DEMO: {
  fecha: string;
  categoria: string;
  tipoSesion: string;
  objetivo: string;
  deportistas: AsistenciaDemo[];
} = {
  fecha: 'MAR 10/11',
  categoria: 'Fútbol · 4ta división',
  tipoSesion: 'Táctico',
  objetivo: 'Salida desde el fondo y presión tras pérdida',
  deportistas: [
    { id: 'pa1', nombre: 'Agustín Molina', iniciales: 'AM', estado: 'PRESENTE' },
    { id: 'pa2', nombre: 'Joaquín Blanco', iniciales: 'JB', estado: 'PRESENTE' },
    { id: 'pa3', nombre: 'Valentín Ruiz', iniciales: 'VR', estado: 'LLEGO_TARDE', nota: 'Llegó 20 min tarde por el colegio' },
    { id: 'pa4', nombre: 'Franco Medina', iniciales: 'FM', estado: 'AUSENTE' },
    { id: 'pa5', nombre: 'Santiago Luna', iniciales: 'SL', estado: 'PRESENTE' },
    { id: 'pa6', nombre: 'Nahuel Ortiz', iniciales: 'NO', estado: 'SE_RETIRO_ANTES', nota: 'Molestia en el isquiotibial' },
  ],
};

/** Presentismo de la semana por categoría (%). */
export const PRESENTISMO_POR_CATEGORIA: CategoriaBarra[] = [
  { clave: 'reserva', label: 'Reserva', valor: 92 },
  { clave: '4ta', label: '4ta', valor: 88 },
  { clave: '5ta', label: '5ta', valor: 85 },
  { clave: '6ta', label: '6ta', valor: 81 },
  { clave: '7ma', label: '7ma', valor: 90 },
];

/** Deportistas con dos o más ausencias en la semana. */
export const AUSENCIAS_REITERADAS_DEMO: { id: string; nombre: string; iniciales: string; categoria: string; ausencias: number }[] = [
  { id: 'ar1', nombre: 'Bruno Sosa', iniciales: 'BS', categoria: 'Reserva', ausencias: 3 },
  { id: 'ar2', nombre: 'Ignacio Vera', iniciales: 'IV', categoria: '5ta división', ausencias: 2 },
  { id: 'ar3', nombre: 'Lautaro Gómez', iniciales: 'LG', categoria: '7ma división', ausencias: 2 },
];

export interface ConvocatoriaListaDemo {
  id: string;
  dia: string;
  hora: string;
  rival: string;
  condicion: 'Local' | 'Visitante';
  categoria: string;
  convocados: number;
  estado: EstadoEvento;
}

/** El listado de convocatorias. Rivales inventados. */
export const CONVOCATORIAS_LISTA_DEMO: ConvocatoriaListaDemo[] = [
  { id: 'cl1', dia: 'SÁB 14/11', hora: '15:30', rival: 'Atlético Las Acacias', condicion: 'Local', categoria: '4ta división', convocados: 18, estado: 'PROGRAMADO' },
  { id: 'cl2', dia: 'SÁB 14/11', hora: '11:00', rival: 'Deportivo El Ombú', condicion: 'Visitante', categoria: '6ta división', convocados: 20, estado: 'PROGRAMADO' },
  { id: 'cl3', dia: 'DOM 15/11', hora: '10:00', rival: 'Unión del Sur', condicion: 'Local', categoria: 'Reserva', convocados: 19, estado: 'REPROGRAMADO' },
  { id: 'cl4', dia: 'SÁB 7/11', hora: '15:30', rival: 'Sportivo Los Pinos', condicion: 'Visitante', categoria: '4ta división', convocados: 18, estado: 'PROGRAMADO' },
  { id: 'cl5', dia: 'SÁB 7/11', hora: '11:00', rival: 'Juventud Unida', condicion: 'Local', categoria: '5ta división', convocados: 18, estado: 'SUSPENDIDO' },
];

/** El detalle de la convocatoria: lo que agrega a `CONVOCATORIA_DEMO`. */
export const CONVOCATORIA_DETALLE_EXTRA = {
  entrenador: 'Prof. Diego Romero',
  observaciones: 'Traer documento y ropa de recambio. Viaje en micro desde la sede.',
  estados: {
    c1: 'ACTIVO',
    c2: 'ACTIVO',
    c3: 'LESIONADO',
    c4: 'ACTIVO',
    c5: 'ACTIVO',
    c6: 'ACTIVO',
    c7: 'ACTIVO',
  } as Record<string, EstadoDeportista>,
};

export type ComidaDemo = 'DESAYUNO' | 'ALMUERZO' | 'MERIENDA' | 'CENA';

export interface ViandaDeportistaDemo {
  id: string;
  nombre: string;
  iniciales: string;
  /** Lo que tiene previsto en su ficha. */
  ficha: 'Almuerzo' | 'Cena' | 'Almuerzo y cena';
  entregas: Partial<Record<ComidaDemo, string>>;
}

/** El panel del día de viandas (la hora de cada retiro). */
export const VIANDAS_PANEL_DEMO: {
  fecha: string;
  categoria: string;
  lugar: string;
  contadores: { comida: ComidaDemo; label: string; retiradas: number; esperadas: number }[];
  deportistas: ViandaDeportistaDemo[];
} = {
  fecha: 'Hoy, martes 10/11',
  categoria: 'Fútbol · Reserva',
  lugar: 'Sede',
  contadores: [
    { comida: 'DESAYUNO', label: 'Desayuno', retiradas: 21, esperadas: 24 },
    { comida: 'ALMUERZO', label: 'Almuerzo', retiradas: 14, esperadas: 16 },
    { comida: 'MERIENDA', label: 'Merienda', retiradas: 0, esperadas: 0 },
    { comida: 'CENA', label: 'Cena', retiradas: 3, esperadas: 9 },
  ],
  deportistas: [
    { id: 'v1', nombre: 'Ramiro Acosta', iniciales: 'RA', ficha: 'Almuerzo y cena', entregas: { DESAYUNO: '08:10', ALMUERZO: '12:40' } },
    { id: 'v2', nombre: 'Mateo Quiroga', iniciales: 'MQ', ficha: 'Almuerzo', entregas: { DESAYUNO: '08:05', ALMUERZO: '12:35' } },
    { id: 'v3', nombre: 'Bruno Sosa', iniciales: 'BS', ficha: 'Almuerzo y cena', entregas: { DESAYUNO: '08:22' } },
    { id: 'v4', nombre: 'Emiliano Paz', iniciales: 'EP', ficha: 'Cena', entregas: { DESAYUNO: '08:15' } },
  ],
};

export type TipoDiaDemo = 'TORNEO' | 'RECESO' | 'RECUPERO' | 'SIN_ACTIVIDAD';

/** Noviembre de 2026 (arranca domingo 1): los días con tipo y los partidos por día. */
export const CALENDARIO_MES_DEMO: {
  titulo: string;
  /** Celdas vacías antes del día 1 en una semana que arranca el lunes. */
  offset: number;
  dias: number;
  hoy: number;
  tipos: Partial<Record<number, TipoDiaDemo>>;
  partidos: Partial<Record<number, { categoria: string; rival: string; estado: EstadoEvento }[]>>;
} = {
  titulo: 'Noviembre 2026',
  offset: 6,
  dias: 30,
  hoy: 10,
  tipos: {
    1: 'TORNEO', 7: 'TORNEO', 8: 'TORNEO', 14: 'TORNEO', 15: 'TORNEO',
    21: 'RECESO', 22: 'RECESO', 23: 'SIN_ACTIVIDAD', 28: 'RECUPERO', 29: 'RECUPERO',
  },
  partidos: {
    7: [
      { categoria: '4ta', rival: 'Sportivo Los Pinos', estado: 'PROGRAMADO' },
      { categoria: '5ta', rival: 'Juventud Unida', estado: 'SUSPENDIDO' },
    ],
    14: [
      { categoria: '4ta', rival: 'Atlético Las Acacias', estado: 'PROGRAMADO' },
      { categoria: '6ta', rival: 'Deportivo El Ombú', estado: 'PROGRAMADO' },
    ],
    15: [{ categoria: 'Reserva', rival: 'Unión del Sur', estado: 'REPROGRAMADO' }],
    28: [{ categoria: '5ta', rival: 'Juventud Unida', estado: 'PROGRAMADO' }],
  },
};

/** La vista anual resumida: cuatro meses con sus días marcados. */
export const CALENDARIO_ANIO_DEMO: {
  mes: string;
  offset: number;
  dias: number;
  tipos: Partial<Record<number, TipoDiaDemo>>;
}[] = [
  { mes: 'Septiembre', offset: 1, dias: 30, tipos: { 5: 'TORNEO', 6: 'TORNEO', 12: 'TORNEO', 13: 'TORNEO', 19: 'TORNEO', 20: 'TORNEO', 26: 'TORNEO', 27: 'TORNEO' } },
  { mes: 'Octubre', offset: 3, dias: 31, tipos: { 3: 'TORNEO', 4: 'TORNEO', 10: 'RECESO', 11: 'RECESO', 12: 'SIN_ACTIVIDAD', 17: 'TORNEO', 18: 'TORNEO', 24: 'TORNEO', 25: 'TORNEO', 31: 'TORNEO' } },
  { mes: 'Noviembre', offset: 6, dias: 30, tipos: { 1: 'TORNEO', 7: 'TORNEO', 8: 'TORNEO', 14: 'TORNEO', 15: 'TORNEO', 21: 'RECESO', 22: 'RECESO', 23: 'SIN_ACTIVIDAD', 28: 'RECUPERO', 29: 'RECUPERO' } },
  { mes: 'Diciembre', offset: 1, dias: 31, tipos: { 5: 'TORNEO', 6: 'TORNEO', 12: 'TORNEO', 13: 'TORNEO', 19: 'RECESO', 20: 'RECESO', 24: 'SIN_ACTIVIDAD', 25: 'SIN_ACTIVIDAD', 31: 'SIN_ACTIVIDAD' } },
];

/** Los próximos partidos de la agenda. */
export const PROXIMOS_PARTIDOS_DEMO: { id: string; dia: string; hora: string; categoria: string; partido: string; estado: EstadoEvento }[] = [
  { id: 'pp1', dia: 'SÁB 14/11', hora: '15:30', categoria: '4ta división', partido: 'Local vs. Atlético Las Acacias', estado: 'PROGRAMADO' },
  { id: 'pp2', dia: 'SÁB 14/11', hora: '11:00', categoria: '6ta división', partido: 'Visitante vs. Deportivo El Ombú', estado: 'PROGRAMADO' },
  { id: 'pp3', dia: 'DOM 15/11', hora: '10:00', categoria: 'Reserva', partido: 'Local vs. Unión del Sur', estado: 'REPROGRAMADO' },
  { id: 'pp4', dia: 'SÁB 28/11', hora: '11:00', categoria: '5ta división', partido: 'Local vs. Juventud Unida', estado: 'PROGRAMADO' },
];

/** El widget del constructor de Insights: promedio de IMC por categoría. */
export const IMC_POR_CATEGORIA: CategoriaBarra[] = [
  { clave: '7ma', label: '7ma', valor: 20.4 },
  { clave: '6ta', label: '6ta', valor: 21.1 },
  { clave: '5ta', label: '5ta', valor: 21.8 },
  { clave: '4ta', label: '4ta', valor: 22.3 },
  { clave: 'reserva', label: 'Reserva', valor: 23.0 },
];

/** El club de ejemplo de la pantalla de branding. Inventado. */
export const CLUB_EJEMPLO_DEMO = {
  nombre: 'Club Social Los Álamos',
  iniciales: 'LA',
  colores: [
    { label: 'Primario', hex: '#14532D' },
    { label: 'Secundario', hex: '#15803D' },
    { label: 'Acento', hex: '#EAB308' },
  ],
};

export interface UsuarioDemo {
  id: string;
  nombre: string;
  iniciales: string;
  email: string;
  rol: AppRole;
  ultimoIngreso: string;
  estado: 'Activo' | 'Pendiente' | 'Deshabilitado';
}

/** Los usuarios del club de ejemplo. Emails con dominio de ejemplo. */
export const USUARIOS_DEMO: UsuarioDemo[] = [
  { id: 'u1', nombre: 'Laura Giménez', iniciales: 'LG', email: 'laura@ejemplo.com', rol: 'admin', ultimoIngreso: 'Hoy', estado: 'Activo' },
  { id: 'u2', nombre: 'Diego Romero', iniciales: 'DR', email: 'diego@ejemplo.com', rol: 'entrenador', ultimoIngreso: 'Hoy', estado: 'Activo' },
  { id: 'u3', nombre: 'Pablo Ibáñez', iniciales: 'PI', email: 'pablo@ejemplo.com', rol: 'medico', ultimoIngreso: 'Ayer', estado: 'Activo' },
  { id: 'u4', nombre: 'Sofía Paredes', iniciales: 'SP', email: 'sofia@ejemplo.com', rol: 'psicologo', ultimoIngreso: '8/11', estado: 'Activo' },
  { id: 'u5', nombre: 'Martín Duarte', iniciales: 'MD', email: 'martin@ejemplo.com', rol: 'nutricionista', ultimoIngreso: '—', estado: 'Pendiente' },
  { id: 'u6', nombre: 'Rosa Ledesma', iniciales: 'RL', email: 'rosa@ejemplo.com', rol: 'responsable_viandas', ultimoIngreso: 'Hoy', estado: 'Activo' },
];
