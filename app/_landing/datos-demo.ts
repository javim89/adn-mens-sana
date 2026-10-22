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
  { id: 't1', dia: 'LUN 9/11', hora: '09:30', titulo: 'Kinesiología', detalle: '4ta división · Estancia Chica' },
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
