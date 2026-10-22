import type { NavItem } from '@/lib/roles';

/**
 * Cuánto dura cada feature activa antes de que el acordeón pase a la siguiente.
 * La animación de la barra en `globals.css` (`landing-progreso`, 7s) tiene que coincidir:
 * el avance lo dispara su `animationend`.
 */
export const DURACION_FUNCIONALIDAD_MS = 7000;

export type FuncionalidadId = 'insights' | 'seguimientos' | 'convocatorias' | 'deportistas';

export interface Funcionalidad {
  id: FuncionalidadId;
  titulo: string;
  descripcion: string;
  /** El módulo del sidebar: de ahí salen el ícono y el ítem activo de la demo. */
  href: NavItem['href'];
}

export const FUNCIONALIDADES: readonly Funcionalidad[] = [
  {
    id: 'insights',
    titulo: 'Insights',
    descripcion:
      'Tableros con gráficos y KPIs sobre presentismo, viandas, seguimientos y triage. Filtrá por categoría y exportá a CSV o PNG.',
    href: '/insights',
  },
  {
    id: 'seguimientos',
    titulo: 'Seguimientos',
    descripcion:
      'Médicos, kinesiólogos, psicólogos, nutricionistas y el área social registran cada seguimiento en la ficha del deportista y agendan sus turnos. Cada rol ve solo lo que le corresponde.',
    href: '/seguimientos',
  },
  {
    id: 'convocatorias',
    titulo: 'Convocatorias',
    descripcion:
      'Citá a los deportistas a cada partido con fecha, hora de citación y lugar, por disciplina y categoría.',
    href: '/convocatorias',
  },
  {
    id: 'deportistas',
    titulo: 'Deportistas',
    descripcion:
      'Una ficha integral con datos personales, escolares, sociales y de salud, la trayectoria por divisiones y el nivel de triage: Verde, Amarillo, Naranja o Rojo.',
    href: '/deportistas',
  },
];

/**
 * El lienzo de diseño de las demos en lg+ (px): la ventana entera de la app, con el
 * sidebar completo. `EscenarioDemo` lo escala para que llene el ancho de la ventana de
 * la demo, que tiene la misma proporción (`lg:aspect-[1280/832]`), así entra entero.
 */
export const LIENZO_ANCHO = 1280;
export const LIENZO_ALTO = 832;

/** La escala del lienzo para una ventana de `anchoVentana` px. */
export function calcularEscala(anchoVentana: number): number {
  return Math.max(0, anchoVentana) / LIENZO_ANCHO;
}
