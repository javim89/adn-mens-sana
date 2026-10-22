/**
 * Los datos de ejemplo de la landing, en un solo lugar.
 *
 * **Son fijos y ficticios a propósito.** La landing es pública: no consulta la base,
 * no muestra nombres reales de deportistas ni de profesionales, y los números no
 * describen al plantel actual. Están tipados con los mismos tipos que usan los
 * componentes del dashboard para que una card de acá sea exactamente la del panel.
 */
import type { NavItem } from '@/lib/roles';
import type { ConteoPorNivel } from '@/lib/queries/triage';
import type { Variacion } from '../(app)/dashboard/_lib/variacion';
import type { CategoriaBarra } from '../(app)/dashboard/_components/BarrasCategoria';
import type { EstadoDeportista, NivelTriage } from '@/lib/generated/prisma/enums';
import type { PrioridadSeguimiento, TipoSeguimiento } from '@/lib/types/seguimientos';
import type { ChartProps } from '../(app)/insights/_components/charts/types';

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
