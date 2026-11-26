import type { ReactNode } from 'react';
import type { ClavePantalla } from '@/app/_landing/funcionalidades/catalogo';
import { PantallaCalendarioAgenda, PantallaCalendarioMes } from './calendario';
import { PantallaBrandingConfiguracion, PantallaUsuariosRoles } from './club';
import { PantallaConvocatoriaDetalle, PantallaConvocatoriasLista } from './convocatorias';
import { PantallaDashboard } from './dashboard';
import { PantallaFichaPestanas, PantallaFichaTrayectoria } from './ficha';
import { PantallaInsightsConsulta, PantallaInsightsPanel } from './insights';
import { PantallaPresentismoEstadisticas, PantallaPresentismoToma } from './presentismo';
import { PantallaSeguimientoFormulario, PantallaSeguimientosLista } from './seguimientos';
import { PantallaTriageAlertas, PantallaTriagePlantel } from './triage';
import { PantallaTurnosAgenda, PantallaTurnosPorProfesional } from './turnos';
import { PantallaViandasPanel, PantallaViandasPorComida } from './viandas';

/**
 * Las pantallas recreadas de las páginas de funcionalidades, una por clave de
 * `CLAVES_PANTALLA`. Cada una devuelve la ventana entera (decorativa: `aria-hidden` +
 * `inert`); la página la pone en un `<figure>` con `DESCRIPCION_PANTALLA` de figcaption.
 */
export const PANTALLAS: Record<ClavePantalla, () => ReactNode> = {
  dashboard: () => <PantallaDashboard />,
  'ficha-pestanas': () => <PantallaFichaPestanas />,
  'ficha-trayectoria': () => <PantallaFichaTrayectoria />,
  'seguimientos-lista': () => <PantallaSeguimientosLista />,
  'seguimiento-formulario': () => <PantallaSeguimientoFormulario />,
  'triage-plantel': () => <PantallaTriagePlantel />,
  'triage-alertas': () => <PantallaTriageAlertas />,
  'turnos-agenda': () => <PantallaTurnosAgenda />,
  'turnos-por-profesional': () => <PantallaTurnosPorProfesional />,
  'presentismo-toma': () => <PantallaPresentismoToma />,
  'presentismo-estadisticas': () => <PantallaPresentismoEstadisticas />,
  'convocatorias-lista': () => <PantallaConvocatoriasLista />,
  'convocatoria-detalle': () => <PantallaConvocatoriaDetalle />,
  'viandas-panel': () => <PantallaViandasPanel />,
  'viandas-por-comida': () => <PantallaViandasPorComida />,
  'calendario-mes': () => <PantallaCalendarioMes />,
  'calendario-agenda': () => <PantallaCalendarioAgenda />,
  'insights-panel': () => <PantallaInsightsPanel />,
  'insights-consulta': () => <PantallaInsightsConsulta />,
  'branding-configuracion': () => <PantallaBrandingConfiguracion />,
  'usuarios-roles': () => <PantallaUsuariosRoles />,
};

/** Una oración por pantalla: el texto visible (figcaption) que dice qué muestra. */
export const DESCRIPCION_PANTALLA: Record<ClavePantalla, string> = {
  dashboard:
    'El tablero de la semana: triage del plantel, presentismo y próximos turnos, de un vistazo.',
  'ficha-pestanas':
    'La ficha de un deportista con su estado, su nivel de triage y la pestaña de salud abierta.',
  'ficha-trayectoria':
    'La pestaña Trayectoria: cada división por la que pasó el deportista, sus clubes anteriores y su historia deportiva.',
  'seguimientos-lista':
    'El listado de seguimientos con deportista, tipo, fecha y prioridad, y los abiertos por tipo.',
  'seguimiento-formulario':
    'Un seguimiento de antropometría: medidas y pliegues, con el IMC y la suma de pliegues calculados solos.',
  'triage-plantel':
    'El plantel con la distribución de triage en Verde, Amarillo, Naranja y Rojo, y el nivel de cada deportista.',
  'triage-alertas':
    'El tablero con los deportistas activos en rojo y a quién atender primero, con el motivo de cada nivel.',
  'turnos-agenda':
    'La agenda de turnos de la semana con fecha, hora, profesional, lugar y deportistas citados.',
  'turnos-por-profesional':
    'Los turnos de la semana agrupados por profesional, con su área y los deportistas que atiende.',
  'presentismo-toma':
    'La toma de asistencia de un entrenamiento: presente, ausente, llegó tarde o se retiró antes, con notas por deportista.',
  'presentismo-estadisticas':
    'El presentismo de la semana: porcentaje general, asistencia por día y quiénes tienen dos o más ausencias.',
  'convocatorias-lista':
    'El listado de convocatorias por partido, con fecha, rival, condición, estado y cantidad de convocados.',
  'convocatoria-detalle':
    'El detalle de una convocatoria: partido, hora de citación, lugar, entrenador y los convocados con su estado.',
  'viandas-panel':
    'El panel de viandas del día: retiradas y esperadas por comida, y un registro por deportista con la hora de cada retiro.',
  'viandas-por-comida':
    'El panel filtrado por almuerzo: solo los deportistas que lo tienen en su ficha, junto a las viandas de la semana.',
  'calendario-mes':
    'La vista mensual del calendario con días de torneo, receso, recupero y sin actividad, y los partidos de cada categoría.',
  'calendario-agenda':
    'La temporada mes a mes con los días marcados y la lista de próximos partidos por categoría.',
  'insights-panel':
    'Un tablero de Insights con el presentismo de las últimas 12 semanas, filtros por categoría y exportación a CSV.',
  'insights-consulta':
    'El constructor visual de Insights: datos, medida, agrupación y tipo de gráfico, con el resultado al instante.',
  'branding-configuracion':
    'La configuración del club: nombre, logo y colores sugeridos, con la vista previa de la app en esos colores.',
  'usuarios-roles':
    'La lista de usuarios del club con su rol, último ingreso y estado, incluidas las invitaciones pendientes.',
};
