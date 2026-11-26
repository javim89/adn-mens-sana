import type { ICON_MAP } from '@/lib/nav-icons';

/**
 * Las pantallas recreadas que puede mostrar una página de funcionalidad. Las implementa
 * `app/_landing/pantallas/index.tsx` (`PANTALLAS` y `DESCRIPCION_PANTALLA`).
 */
export const CLAVES_PANTALLA = [
  'dashboard',
  'ficha-pestanas', 'ficha-trayectoria',
  'seguimientos-lista', 'seguimiento-formulario',
  'triage-plantel', 'triage-alertas',
  'turnos-agenda', 'turnos-por-profesional',
  'presentismo-toma', 'presentismo-estadisticas',
  'convocatorias-lista', 'convocatoria-detalle',
  'viandas-panel', 'viandas-por-comida',
  'calendario-mes', 'calendario-agenda',
  'insights-panel', 'insights-consulta',
  'branding-configuracion', 'usuarios-roles',
] as const;

export type ClavePantalla = (typeof CLAVES_PANTALLA)[number];

export type IconName = keyof typeof ICON_MAP;

export interface Beneficio {
  titulo: string;
  items: string[];
}

export interface Paso {
  titulo: string;
  texto: string;
}

export interface Bloque {
  titulo: string;
  texto: string;
  pantalla: ClavePantalla;
}

export interface Faq {
  pregunta: string;
  respuesta: string;
}

export interface PaginaFuncionalidad {
  slug: string;
  nombre: string;
  icono: IconName;
  /** 1-2 oraciones para la tarjeta del índice. */
  resumen: string;
  /**
   * 2-3 oraciones que responden "¿qué es / cómo funciona <X> en BioTeam?" por sí solas
   * (nombran a BioTeam y a la funcionalidad): las citan los buscadores con IA y se ven
   * como "En pocas palabras". Entre 160 y 420 caracteres.
   */
  resumenRespuesta: string;
  /** `titulo` ≤ 60 caracteres, `descripcion` entre 70 y 160. */
  seo: { titulo: string; descripcion: string };
  eyebrow: string;
  h1: string;
  bajada: string;
  pantallaHero: ClavePantalla;
  beneficios: [Beneficio, Beneficio, Beneficio];
  pasos: [Paso, Paso, Paso];
  bloques: [Bloque, Bloque];
  faqs: Faq[];
}

export const RUTA_FUNCIONALIDADES = '/funcionalidades';

/** Fecha ISO de la última revisión del contenido público: `lastModified` del sitemap y `dateModified` del JSON-LD. */
export const ACTUALIZADO = '2026-11-26';

export function rutaFuncionalidad(slug: string): string {
  return `${RUTA_FUNCIONALIDADES}/${slug}`;
}

export const PAGINAS_FUNCIONALIDAD: readonly PaginaFuncionalidad[] = [
  {
    slug: 'ficha-del-deportista',
    nombre: 'Ficha del deportista',
    icono: 'Users',
    resumen:
      'Un legajo único por deportista con datos personales, deportivos, escolares, sociales y de salud, foto y trayectoria por divisiones.',
    resumenRespuesta:
      'La ficha del deportista de BioTeam es el legajo único de cada deportista del club: reúne datos personales, deportivos, escolares, sociales, familiares y de salud, con foto y su trayectoria por divisiones. Las áreas de salud, social y deportiva la completan de a poco, y los seguimientos de los profesionales quedan en la misma ficha.',
    seo: {
      titulo: 'Ficha del deportista: legajo integral para clubes',
      descripcion:
        'Centralizá datos personales, escolares, sociales y de salud de cada deportista, con foto, trayectoria por divisiones y nivel de triage. Probá BioTeam.',
    },
    eyebrow: 'Ficha del deportista',
    h1: 'Ficha integral del deportista para clubes deportivos',
    bajada:
      'Todo lo que el club sabe de cada chico o chica, en un solo lugar: datos personales, deportivos, escolares, sociales y de salud, su recorrido por las divisiones y los seguimientos de los profesionales.',
    pantallaHero: 'ficha-pestanas',
    beneficios: [
      {
        titulo: 'Un solo legajo',
        items: [
          'Datos personales, deportivos, escolares, sociales y de salud en pestañas',
          'Foto de perfil con recorte',
          'Datos familiares, vivienda y necesidades de apoyo',
        ],
      },
      {
        titulo: 'La historia completa',
        items: [
          'Paso por cada división, con fecha de inicio y fin',
          'Clubes anteriores e historia deportiva',
          'Seguimientos de todo el equipo profesional en una línea de tiempo',
        ],
      },
      {
        titulo: 'El plantel a mano',
        items: [
          'Búsqueda por nombre, apellido o DNI',
          'Filtros por disciplina, categoría, estado y nivel de triage',
          'Estado de cada deportista: activo, lesionado, suspendido o inactivo',
        ],
      },
    ],
    pasos: [
      {
        titulo: 'Cargás al deportista',
        texto:
          'Completás sus datos básicos y su disciplina y categoría. El resto de la ficha se va sumando a medida que lo conocen.',
      },
      {
        titulo: 'El equipo suma información',
        texto:
          'Las áreas de salud, social y deportiva completan sus pestañas y registran seguimientos sin pisarse.',
      },
      {
        titulo: 'Lo acompañás en el tiempo',
        texto:
          'Cada cambio de división queda en su trayectoria y el triage resume su situación en un color.',
      },
    ],
    bloques: [
      {
        titulo: 'Su recorrido por las divisiones',
        texto:
          'La pestaña Trayectoria muestra cada división por la que pasó, con sus fechas, los clubes en los que jugó antes y los hitos de su historia deportiva.',
        pantalla: 'ficha-trayectoria',
      },
      {
        titulo: 'Los seguimientos, dentro de la ficha',
        texto:
          'Médicos, psicólogos, nutricionistas y el área social registran sus seguimientos y quedan asociados al deportista, ordenados por fecha y con su prioridad.',
        pantalla: 'seguimientos-lista',
      },
    ],
    faqs: [
      {
        pregunta: '¿Qué datos tiene la ficha del deportista?',
        respuesta:
          'La ficha del deportista de BioTeam tiene datos personales y de contacto, deportivos (disciplina, categoría, posición, estado, fecha de ingreso), escolares, sociales y familiares, vivienda, necesidades de apoyo y salud: grupo sanguíneo, obra social, enfermedades preexistentes, antecedentes familiares, medicación e historial de lesiones.',
      },
      {
        pregunta: '¿Puedo cargar la ficha de a poco?',
        respuesta:
          'Sí. En la ficha del deportista de BioTeam solo son obligatorios los datos básicos: nombre, apellido, DNI y fecha de nacimiento. El resto de las pestañas se completa cuando el club tiene la información.',
      },
      {
        pregunta: '¿Cómo se registra un cambio de división?',
        respuesta:
          'Desde la gestión de divisiones de la ficha del deportista registrás el paso a la nueva categoría con su fecha. BioTeam cierra el período anterior y lo deja en la trayectoria del deportista.',
      },
      {
        pregunta: '¿Otro club puede ver los datos de mis deportistas?',
        respuesta:
          'No. En BioTeam cada club ve solo sus propios datos: las fichas, los seguimientos y las fotos de los deportistas quedan separados por club.',
      },
    ],
  },
  {
    slug: 'seguimientos-medicos',
    nombre: 'Seguimientos médicos',
    icono: 'ClipboardList',
    resumen:
      'Historia clínica, traumatología, evaluaciones psicológicas y cardiológicas, antropometría y seguimiento social, con prioridad y próxima cita.',
    resumenRespuesta:
      'Los seguimientos médicos de BioTeam registran cada intervención del equipo profesional en la ficha del deportista: historia clínica, traumatología, evaluaciones psicológicas y cardiológicas y antropometría, cada una con su formulario y su prioridad. Cada profesional carga los de su especialidad y los entrenadores los ven en modo lectura.',
    seo: {
      titulo: 'Historia clínica y seguimientos médicos | BioTeam',
      descripcion:
        'Registrá historia clínica, traumatología, evaluaciones psicológicas y cardiológicas y antropometría de cada deportista, con prioridad y próxima cita.',
    },
    eyebrow: 'Seguimientos',
    h1: 'Historia clínica y seguimientos médicos para clubes deportivos',
    bajada:
      'Médicos, psicólogos, cardiólogos, nutricionistas, kinesiólogos y el área social registran cada intervención en la ficha del deportista, con formularios pensados para su especialidad.',
    pantallaHero: 'seguimientos-lista',
    beneficios: [
      {
        titulo: 'Formularios por especialidad',
        items: [
          'Historia clínica y traumatología',
          'Evaluación psicológica (CPRD, POMS, STAI y sociograma)',
          'Evaluación cardiológica y antropometría',
        ],
      },
      {
        titulo: 'Prioridades claras',
        items: [
          'Prioridad baja, media, alta o urgente',
          'Próxima cita y alerta de seguimiento',
          'Recomendaciones y resultados de cada evaluación',
        ],
      },
      {
        titulo: 'Menos trabajo manual',
        items: [
          'IMC y sumatoria de pliegues calculados solos',
          'Un mismo seguimiento para varios deportistas',
          'Filtros por prioridad, profesional, disciplina y categoría',
        ],
      },
    ],
    pasos: [
      {
        titulo: 'Elegís el tipo de seguimiento',
        texto:
          'Cada profesional ve los tipos de su especialidad: el médico, historia clínica y traumatología; el psicólogo, la evaluación psicológica; el nutricionista, la antropometría.',
      },
      {
        titulo: 'Completás la evaluación',
        texto:
          'Cargás la fecha, los deportistas, los datos del formulario, la prioridad y, si hace falta, la próxima cita.',
      },
      {
        titulo: 'Queda en la ficha',
        texto:
          'El seguimiento aparece en la línea de tiempo del deportista y alimenta su nivel de triage.',
      },
    ],
    bloques: [
      {
        titulo: 'Un formulario para cada área',
        texto:
          'Antropometría con pesos, perímetros y pliegues; evaluación cardiológica con ECG y examen físico; evaluación psicológica con escalas estandarizadas. Cada área carga lo suyo.',
        pantalla: 'seguimiento-formulario',
      },
      {
        titulo: 'Lo urgente no se pierde',
        texto:
          'Los seguimientos de prioridad alta o urgente suben el nivel de triage del deportista, y la coordinación ve en el tablero a quiénes atender primero.',
        pantalla: 'triage-alertas',
      },
    ],
    faqs: [
      {
        pregunta: '¿Qué tipos de seguimiento puedo registrar?',
        respuesta:
          'BioTeam tiene seis tipos de seguimiento: genérico, historia clínica, traumatología, evaluación psicológica, evaluación cardiológica y antropometría. Cada tipo tiene su propio formulario.',
      },
      {
        pregunta: '¿Quién puede cargar seguimientos?',
        respuesta:
          'En BioTeam cargan seguimientos los profesionales de salud y el área social del club. Cada rol crea los seguimientos de su especialidad y solo edita o elimina los que cargó.',
      },
      {
        pregunta: '¿Los entrenadores pueden ver los seguimientos?',
        respuesta:
          'Sí, en modo lectura: el cuerpo técnico ve los seguimientos de cada deportista y sabe qué le pasa sin tener que preguntar, pero no puede crearlos ni modificarlos.',
      },
      {
        pregunta: '¿Se calcula el IMC automáticamente?',
        respuesta:
          'Sí. En el seguimiento de antropometría, BioTeam calcula el IMC y la sumatoria de pliegues a partir de los valores cargados.',
      },
      {
        pregunta: '¿Puedo registrar un seguimiento para varios deportistas a la vez?',
        respuesta:
          'Sí. Un seguimiento puede incluir a varios deportistas, por ejemplo una charla grupal o una evaluación hecha a toda una categoría.',
      },
    ],
  },
  {
    slug: 'triage-deportivo',
    nombre: 'Triage deportivo',
    icono: 'Activity',
    resumen:
      'Un semáforo de cuatro niveles que resume la situación médica, psicológica, social y deportiva de cada deportista.',
    resumenRespuesta:
      'El triage deportivo de BioTeam asigna a cada deportista un nivel Verde, Amarillo, Naranja o Rojo a partir de sus seguimientos médicos y psicológicos, sus ausencias, sus citaciones a los últimos partidos y sus datos sociales. Se recalcula una vez por semana y ayuda al club a detectar a tiempo a quién priorizar, sin reemplazar el criterio de los profesionales.',
    seo: {
      titulo: 'Triage deportivo: prioridades del plantel | BioTeam',
      descripcion:
        'Cada deportista con un nivel Verde, Amarillo, Naranja o Rojo según su situación médica, psicológica, social y deportiva. Detectá a tiempo a quién priorizar.',
    },
    eyebrow: 'Triage',
    h1: 'Triage deportivo para priorizar a cada deportista del plantel',
    bajada:
      'BioTeam cruza los seguimientos, el presentismo, las convocatorias y los datos sociales de cada deportista y le asigna un nivel: Verde, Amarillo, Naranja o Rojo.',
    pantallaHero: 'triage-plantel',
    beneficios: [
      {
        titulo: 'Una mirada integral',
        items: [
          'Áreas médica, psicológica, nutricional, social y deportiva',
          'Ausencias de la semana y citaciones a los partidos',
          'Puntaje extra cuando hay varias áreas críticas a la vez',
        ],
      },
      {
        titulo: 'Transparente',
        items: [
          'Desglose de cada regla que sumó puntos',
          'Historial de niveles en el tiempo',
        ],
      },
      {
        titulo: 'Siempre actualizado',
        items: [
          'Recálculo automático todas las semanas',
          'Botón para recalcular en el momento desde la ficha',
          'Filtro por nivel en el listado de deportistas',
        ],
      },
    ],
    pasos: [
      {
        titulo: 'El equipo registra',
        texto:
          'Los profesionales cargan seguimientos, los entrenadores toman asistencia y arman convocatorias, el área social completa la ficha.',
      },
      {
        titulo: 'BioTeam calcula',
        texto:
          'Cada regla suma puntos según el área y la prioridad. El total define el nivel de triage del deportista.',
      },
      {
        titulo: 'La coordinación prioriza',
        texto:
          'El tablero muestra a los deportistas activos en rojo y la distribución del plantel por nivel.',
      },
    ],
    bloques: [
      {
        titulo: 'Alertas en el tablero',
        texto:
          'Al entrar ves cuántos deportistas activos están en rojo y cómo se reparte el plantel entre los cuatro niveles, con acceso directo a cada ficha.',
        pantalla: 'triage-alertas',
      },
      {
        titulo: 'El porqué de cada nivel',
        texto:
          'Desde la ficha ves qué seguimientos y qué situaciones explican el nivel: no es una caja negra, es un resumen del trabajo del equipo.',
        pantalla: 'seguimientos-lista',
      },
    ],
    faqs: [
      {
        pregunta: '¿Qué significa cada nivel de triage?',
        respuesta:
          'En el triage de BioTeam, Verde significa sin alertas; Amarillo, alguna situación a observar; Naranja, varias señales que conviene atender, y Rojo, que el deportista necesita atención prioritaria.',
      },
      {
        pregunta: '¿Qué datos usa el triage?',
        respuesta:
          'El triage de BioTeam usa los seguimientos médicos, psicológicos y de antropometría y su prioridad, las ausencias de la semana, las citaciones a los últimos partidos y datos sociales de la ficha, como vivienda, trabajo en el hogar, alimentación y apoyos requeridos.',
      },
      {
        pregunta: '¿Cada cuánto se actualiza?',
        respuesta:
          'El triage se recalcula automáticamente una vez por semana para todo el plantel, y también se puede recalcular en el momento desde la ficha de un deportista.',
      },
      {
        pregunta: '¿El triage reemplaza el criterio del profesional?',
        respuesta:
          'No. El triage es una herramienta para ordenar prioridades a partir de lo que el equipo registró en BioTeam. Las decisiones las siguen tomando los profesionales y la coordinación.',
      },
    ],
  },
  {
    slug: 'turnos',
    nombre: 'Turnos',
    icono: 'CalendarDays',
    resumen:
      'La agenda de turnos con los profesionales del club: fecha, hora, lugar y los deportistas citados.',
    resumenRespuesta:
      'Turnos es la agenda compartida de BioTeam para los profesionales de salud del club: médicos, kinesiólogos, psicólogos, cardiólogos y nutricionistas agendan cada turno con fecha, hora, lugar y uno o varios deportistas citados. Cada profesional ve su propia agenda y la administración ve la de todo el club, filtrada por profesional.',
    seo: {
      titulo: 'Agenda de turnos para profesionales del club | BioTeam',
      descripcion:
        'Organizá los turnos de médicos, kinesiólogos, psicólogos y nutricionistas del club: fecha, hora, lugar y deportistas citados, todo en una agenda compartida.',
    },
    eyebrow: 'Turnos',
    h1: 'Agenda de turnos médicos para clubes deportivos',
    bajada:
      'Cada profesional agenda sus turnos con los deportistas y la coordinación ve la agenda completa del club, filtrada por profesional.',
    pantallaHero: 'turnos-agenda',
    beneficios: [
      {
        titulo: 'Turnos completos',
        items: [
          'Título, fecha, hora y lugar',
          'Uno o varios deportistas por turno',
          'Descripción para dejar indicaciones',
        ],
      },
      {
        titulo: 'Cada uno con su agenda',
        items: [
          'El profesional ve sus propios turnos',
          'La administración ve todos y filtra por profesional',
        ],
      },
      {
        titulo: 'La semana a la vista',
        items: [
          'Turnos de esta semana en el tablero',
          'Próximos turnos con acceso directo',
        ],
      },
    ],
    pasos: [
      {
        titulo: 'Creás el turno',
        texto: 'Indicás título, fecha, hora, lugar y el profesional responsable.',
      },
      {
        titulo: 'Citás a los deportistas',
        texto: 'Buscás y elegís a uno o varios deportistas del plantel.',
      },
      {
        titulo: 'Lo seguís desde la agenda',
        texto:
          'El turno aparece en la agenda del profesional y en el tablero de la semana, listo para reprogramar si hace falta.',
      },
    ],
    bloques: [
      {
        titulo: 'La agenda de cada profesional',
        texto:
          'La administración filtra la agenda por profesional para ver la carga de cada área y quién atiende a quién.',
        pantalla: 'turnos-por-profesional',
      },
      {
        titulo: 'Los turnos en contexto',
        texto:
          'Junto al calendario del torneo, la coordinación planifica los turnos sin chocar con los días de partido.',
        pantalla: 'calendario-agenda',
      },
    ],
    faqs: [
      {
        pregunta: '¿Quién puede crear turnos?',
        respuesta:
          'En BioTeam crean turnos la administración del club y los profesionales de salud: médicos, kinesiólogos, psicólogos, cardiólogos y nutricionistas.',
      },
      {
        pregunta: '¿Un turno puede tener varios deportistas?',
        respuesta:
          'Sí. En un mismo turno podés citar a uno o a varios deportistas, por ejemplo para una evaluación grupal.',
      },
      {
        pregunta: '¿Cada profesional ve los turnos de los demás?',
        respuesta:
          'No. Cada profesional ve su propia agenda de turnos. La administración del club ve todos los turnos y puede filtrarlos por profesional.',
      },
      {
        pregunta: '¿Puedo modificar o cancelar un turno?',
        respuesta:
          'Sí. Desde la agenda de turnos editás la fecha, la hora, el lugar o los deportistas citados, o eliminás el turno.',
      },
    ],
  },
  {
    slug: 'presentismo',
    nombre: 'Presentismo',
    icono: 'ClipboardCheck',
    resumen:
      'La asistencia de cada entrenamiento en segundos: presente, ausente, llegó tarde o se retiró antes.',
    resumenRespuesta:
      'El presentismo de BioTeam es la toma de asistencia de cada entrenamiento por disciplina y categoría: el entrenador marca a cada deportista como presente, ausente, llegó tarde o se retiró antes. El club ve el presentismo de la semana y a quién acumula ausencias, que además suman puntos al triage del deportista.',
    seo: {
      titulo: 'Control de asistencia a entrenamientos | BioTeam',
      descripcion:
        'Tomá asistencia en cada entrenamiento por disciplina y categoría: presente, ausente, llegó tarde o se retiró antes. Detectá ausencias reiteradas a tiempo.',
    },
    eyebrow: 'Presentismo',
    h1: 'Control de asistencia a entrenamientos para clubes deportivos',
    bajada:
      'El entrenador registra el entrenamiento, marca la asistencia de su categoría y el club ve el presentismo de la semana y a quién le está costando venir.',
    pantallaHero: 'presentismo-estadisticas',
    beneficios: [
      {
        titulo: 'Rápido en la cancha',
        items: [
          'Marcar a todos presentes con un toque',
          'Buscador dentro del plantel',
          'Notas por deportista',
        ],
      },
      {
        titulo: 'Cada entrenamiento con contexto',
        items: [
          'Disciplina, categoría y fecha',
          'Tipo de sesión: técnico, táctico, físico, mixto o recuperación',
          'Objetivos del entrenamiento',
        ],
      },
      {
        titulo: 'Señales a tiempo',
        items: [
          'Presentismo de la semana en el tablero',
          'Deportistas con dos o más ausencias en la semana',
          'Las ausencias suman al triage',
        ],
      },
    ],
    pasos: [
      {
        titulo: 'Creás el entrenamiento',
        texto: 'Elegís fecha, disciplina, categoría y tipo de sesión, y anotás los objetivos.',
      },
      {
        titulo: 'Marcás la asistencia',
        texto:
          'El plantel de la categoría aparece cargado: marcás presente, ausente, llegó tarde o se retiró antes.',
      },
      {
        titulo: 'El club lo ve',
        texto:
          'El tablero resume el presentismo de la semana y las ausencias reiteradas, con acceso a cada ficha.',
      },
    ],
    bloques: [
      {
        titulo: 'La toma de asistencia',
        texto:
          'Una lista con el plantel de la categoría y cuatro estados por deportista. Con “Marcar todos presentes” solo tocás a los que faltaron.',
        pantalla: 'presentismo-toma',
      },
      {
        titulo: 'El presentismo en tus tableros',
        texto:
          'En Insights cruzás la asistencia por categoría, por tipo de sesión o por período y la comparás con el resto de los datos del club.',
        pantalla: 'insights-panel',
      },
    ],
    faqs: [
      {
        pregunta: '¿Qué estados de asistencia hay?',
        respuesta:
          'El presentismo de BioTeam tiene cuatro estados: presente, ausente, llegó tarde y se retiró antes. Además podés dejar una nota para cada deportista.',
      },
      {
        pregunta: '¿Quién toma la asistencia?',
        respuesta:
          'En BioTeam toman la asistencia los entrenadores y la administración del club. Los profesionales de salud no ven el módulo de presentismo.',
      },
      {
        pregunta: '¿Tengo que cargar a los deportistas en cada entrenamiento?',
        respuesta:
          'No. En el presentismo de BioTeam, al elegir disciplina y categoría aparece el plantel; solo marcás el estado de cada deportista.',
      },
      {
        pregunta: '¿Para qué sirven las ausencias reiteradas?',
        respuesta:
          'El tablero de presentismo muestra a quienes acumulan dos o más ausencias en la semana, y esas ausencias suman puntos al triage del deportista.',
      },
    ],
  },
  {
    slug: 'convocatorias',
    nombre: 'Convocatorias',
    icono: 'Megaphone',
    resumen:
      'La citación de los deportistas a cada partido del torneo, con hora, lugar y la lista de convocados.',
    resumenRespuesta:
      'Las convocatorias de BioTeam son la citación de cada partido del torneo: el entrenador elige el partido del calendario, define la hora y el lugar de citación y arma la lista de convocados de su categoría. Mientras la arma ve qué deportistas están lesionados, suspendidos o inactivos.',
    seo: {
      titulo: 'Convocatorias a partidos por categoría | BioTeam',
      descripcion:
        'Armá la convocatoria de cada partido del torneo con hora de citación, lugar y lista de convocados, viendo quién está lesionado o suspendido antes de citarlo.',
    },
    eyebrow: 'Convocatorias',
    h1: 'Convocatorias a partidos para cada categoría del club',
    bajada:
      'El entrenador elige el partido del calendario, define la hora de citación y el lugar, y arma la lista de convocados de su categoría.',
    pantallaHero: 'convocatorias-lista',
    beneficios: [
      {
        titulo: 'Atada al fixture',
        items: [
          'Cada convocatoria corresponde a un partido del calendario',
          'Rival, fecha y estado del partido a la vista',
        ],
      },
      {
        titulo: 'Citación completa',
        items: [
          'Hora de citación y lugar',
          'Entrenador a cargo y observaciones',
          'Lista de convocados por disciplina y categoría',
        ],
      },
      {
        titulo: 'Decisiones informadas',
        items: [
          'Ves si un deportista está lesionado o suspendido',
          'Quien no es citado en las últimas tres fechas suma al triage',
        ],
      },
    ],
    pasos: [
      {
        titulo: 'Elegís el partido',
        texto: 'Seleccionás el partido de la categoría desde el calendario del torneo.',
      },
      {
        titulo: 'Definís la citación',
        texto: 'Cargás la hora, el lugar, el entrenador y las observaciones.',
      },
      {
        titulo: 'Armás la lista',
        texto:
          'Marcás a los convocados del plantel de la categoría, con su estado a la vista.',
      },
    ],
    bloques: [
      {
        titulo: 'El detalle de cada convocatoria',
        texto:
          'Partido, rival, hora de citación, lugar y la lista completa de convocados, listo para compartir con el cuerpo técnico.',
        pantalla: 'convocatoria-detalle',
      },
      {
        titulo: 'Desde el calendario del torneo',
        texto:
          'Los partidos de cada categoría ya están en el calendario; la convocatoria se arma sobre ellos.',
        pantalla: 'calendario-mes',
      },
    ],
    faqs: [
      {
        pregunta: '¿Quién arma las convocatorias?',
        respuesta: 'En BioTeam las convocatorias las arman los entrenadores y la administración del club.',
      },
      {
        pregunta: '¿Puedo convocar a un deportista lesionado?',
        respuesta:
          'Sí. La lista de convocados muestra el estado de cada deportista (lesionado, suspendido o inactivo) para que lo tengas en cuenta; la decisión es del cuerpo técnico.',
      },
      {
        pregunta: '¿Qué pasa si el partido se reprograma?',
        respuesta:
          'El partido muestra su estado (programado, suspendido o reprogramado) y podés editar la convocatoria con la nueva hora o el nuevo lugar.',
      },
      {
        pregunta: '¿Las convocatorias influyen en el triage?',
        respuesta:
          'Sí. Si un deportista no fue citado en ninguno de los últimos tres partidos de su categoría, suma puntos en el área deportiva del triage.',
      },
    ],
  },
  {
    slug: 'viandas',
    nombre: 'Viandas',
    icono: 'UtensilsCrossed',
    resumen:
      'El registro diario de desayunos, almuerzos, meriendas y cenas entregados en cada lugar de retiro.',
    resumenRespuesta:
      'Viandas es el registro diario de BioTeam de las comidas que entrega el club: el responsable de cada lugar de retiro marca qué deportistas retiraron desayuno, almuerzo, merienda o cena, según lo que indica su ficha. El club consulta qué se entregó, dónde y a quién, día por día, sin planillas.',
    seo: {
      titulo: 'Control de viandas para deportistas | BioTeam',
      descripcion:
        'Registrá cada día qué deportistas retiraron desayuno, almuerzo, merienda y cena en cada lugar de retiro, según lo que indica su ficha. Sin planillas.',
    },
    eyebrow: 'Viandas',
    h1: 'Control de viandas y comidas para deportistas del club',
    bajada:
      'El responsable de viandas marca cada entrega en el momento y el club sabe qué comidas se entregaron, dónde y a quién, día por día.',
    pantallaHero: 'viandas-panel',
    beneficios: [
      {
        titulo: 'Registro del día',
        items: [
          'Desayuno, almuerzo, merienda y cena',
          'Una entrega por comida y por deportista',
          'Filtros por disciplina, categoría y comida',
        ],
      },
      {
        titulo: 'Según la ficha',
        items: [
          'Cada deportista muestra si recibe almuerzo, cena o ambas',
          'Entregas fuera de ficha señaladas en el tablero',
        ],
      },
      {
        titulo: 'Por lugar de retiro',
        items: [
          'Cada responsable tiene asignado su lugar',
          'La administración ve todos los lugares',
          'Histórico de días anteriores en modo lectura',
        ],
      },
    ],
    pasos: [
      {
        titulo: 'Abrís el panel del día',
        texto:
          'Ves el plantel con lo que cada deportista recibe según su ficha, filtrado por tu lugar de retiro.',
      },
      {
        titulo: 'Marcás cada entrega',
        texto: 'Un toque por comida cuando el deportista la retira. Si te equivocás, la desmarcás.',
      },
      {
        titulo: 'El club tiene el registro',
        texto:
          'El tablero muestra las viandas entregadas en la semana y las que salieron de lo previsto.',
      },
    ],
    bloques: [
      {
        titulo: 'Comida por comida',
        texto:
          'Filtrás por almuerzo, cena o ambas para ver solo a quienes les corresponde y marcar las entregas más rápido.',
        pantalla: 'viandas-por-comida',
      },
      {
        titulo: 'Como tomar asistencia',
        texto:
          'El mismo gesto que el presentismo: una lista del plantel y un toque por deportista, pensado para hacerlo desde el celular.',
        pantalla: 'presentismo-toma',
      },
    ],
    faqs: [
      {
        pregunta: '¿Quién registra las viandas?',
        respuesta:
          'Las viandas las registran los usuarios con rol de responsable de viandas, cada uno en su lugar de retiro, y la administración del club.',
      },
      {
        pregunta: '¿Cómo sé qué comidas le corresponden a cada deportista?',
        respuesta:
          'Las comidas que le corresponden figuran en la ficha del deportista: en las necesidades de apoyo se indica si recibe almuerzo, cena o ambas, y el panel de viandas lo muestra junto a su nombre.',
      },
      {
        pregunta: '¿Se puede entregar dos veces la misma comida?',
        respuesta:
          'No. BioTeam registra una sola entrega por deportista, por comida y por día.',
      },
      {
        pregunta: '¿Puedo ver lo que se entregó otro día?',
        respuesta:
          'Sí. En el panel de viandas elegís la fecha y ves el registro de ese día en modo lectura; las entregas se marcan solo en el día actual.',
      },
    ],
  },
  {
    slug: 'calendario',
    nombre: 'Calendario',
    icono: 'Calendar',
    resumen:
      'Los días de torneo, receso y recupero, con los partidos de cada categoría y su estado.',
    resumenRespuesta:
      'El calendario de BioTeam muestra en un solo lugar los días de torneo, receso y recupero y los partidos de cada categoría, con vista mensual y anual y filtro por categoría. BioTeam lo carga a partir del fixture del torneo y lo consultan todos los roles del club que trabajan con el plantel.',
    seo: {
      titulo: 'Calendario de torneo y partidos por categoría | BioTeam',
      descripcion:
        'Consultá en un solo calendario los días de torneo, receso y recupero y los partidos de cada categoría, con vista mensual y anual y filtro por categoría.',
    },
    eyebrow: 'Calendario',
    h1: 'Calendario del torneo con los partidos de cada categoría',
    bajada:
      'Todo el club mira el mismo calendario: qué días se juega, cuándo hay receso o recupero y contra quién juega cada categoría.',
    pantallaHero: 'calendario-mes',
    beneficios: [
      {
        titulo: 'La temporada de un vistazo',
        items: [
          'Días de torneo, receso, recupero y sin actividad',
          'Vista mensual y vista anual',
        ],
      },
      {
        titulo: 'Partidos por categoría',
        items: [
          'Local y visitante de cada partido',
          'Estado: programado, suspendido o reprogramado',
          'Filtro por categoría',
        ],
      },
      {
        titulo: 'Conectado con el resto',
        items: [
          'Las convocatorias se arman sobre estos partidos',
          'Los próximos partidos en el tablero',
        ],
      },
    ],
    pasos: [
      {
        titulo: 'Cargamos el fixture',
        texto:
          'Al poner en marcha tu club, el equipo de BioTeam carga el calendario del torneo con los partidos de cada categoría.',
      },
      {
        titulo: 'Todos lo consultan',
        texto:
          'Entrenadores, profesionales y la coordinación ven el mismo calendario, filtrado por la categoría que les interesa.',
      },
      {
        titulo: 'Se convoca desde ahí',
        texto: 'Cada partido es la base de su convocatoria.',
      },
    ],
    bloques: [
      {
        titulo: 'Agenda de la temporada',
        texto:
          'Pasás de la vista mensual a la anual para planificar recesos, recuperos y las semanas más cargadas.',
        pantalla: 'calendario-agenda',
      },
      {
        titulo: 'Del partido a la convocatoria',
        texto:
          'Con el partido en el calendario, el entrenador arma la lista de convocados con hora y lugar de citación.',
        pantalla: 'convocatorias-lista',
      },
    ],
    faqs: [
      {
        pregunta: '¿Qué tipos de día muestra el calendario?',
        respuesta: 'El calendario de BioTeam muestra días de torneo, de receso, de recupero y sin actividad, cada uno con su color.',
      },
      {
        pregunta: '¿Puedo ver solo los partidos de una categoría?',
        respuesta: 'Sí. El calendario de BioTeam tiene un filtro por categoría para ver solo los partidos de esa categoría.',
      },
      {
        pregunta: '¿Quién carga el calendario?',
        respuesta:
          'El equipo de BioTeam carga el calendario a partir del fixture del torneo cuando pone en marcha el club. En la app, el club lo consulta.',
      },
      {
        pregunta: '¿Quién puede ver el calendario?',
        respuesta:
          'El calendario de BioTeam lo ven todos los roles del club que trabajan con el plantel: administración, entrenadores, profesionales de salud y área social.',
      },
    ],
  },
  {
    slug: 'insights',
    nombre: 'Insights',
    icono: 'ChartColumn',
    resumen:
      'Tableros con gráficos y KPIs sobre deportistas, seguimientos, presentismo, triage y viandas, con filtros y exportación.',
    resumenRespuesta:
      'Insights es el módulo de análisis de BioTeam: tableros con gráficos y KPIs sobre deportistas, seguimientos, presentismo, turnos, convocatorias, triage y viandas, y un constructor visual para armar gráficos propios sin escribir código. Los tableros se filtran por categoría, los datos se exportan a CSV y cada club ve solo los suyos.',
    seo: {
      titulo: 'Tableros de datos para clubes deportivos | BioTeam',
      descripcion:
        'Armá tableros con gráficos y KPIs sobre deportistas, seguimientos, presentismo, triage y viandas. Filtrá por categoría y exportá los datos a CSV.',
    },
    eyebrow: 'Insights',
    h1: 'Tableros de datos y KPIs para clubes deportivos',
    bajada:
      'Todo lo que el club registra en BioTeam se convierte en información: tableros listos para usar y un constructor visual para armar los tuyos, sin escribir código.',
    pantallaHero: 'insights-panel',
    beneficios: [
      {
        titulo: 'Tableros listos',
        items: [
          'Panorama general del club',
          'Tablero de viandas',
          'Filtros por disciplina, categoría y más',
        ],
      },
      {
        titulo: 'Armá los tuyos',
        items: [
          'Constructor visual, sin código',
          'Barras, líneas, áreas, tortas, KPIs y tablas',
          'Widgets que se mueven y se redimensionan',
        ],
      },
      {
        titulo: 'Todos los datos del club',
        items: [
          'Deportistas, seguimientos y antropometría',
          'Presentismo, turnos y convocatorias',
          'Triage y viandas',
          'Exportación a CSV de cada gráfico',
        ],
      },
    ],
    pasos: [
      {
        titulo: 'Elegís un tablero',
        texto: 'Arrancás con los tableros que ya vienen o creás uno nuevo.',
      },
      {
        titulo: 'Sumás widgets',
        texto:
          'Elegís el conjunto de datos, la métrica, cómo agruparla y el tipo de gráfico.',
      },
      {
        titulo: 'Filtrás y compartís',
        texto:
          'Aplicás filtros a todo el tablero y exportás los datos de cada gráfico a CSV.',
      },
    ],
    bloques: [
      {
        titulo: 'Un constructor visual',
        texto:
          'Elegís qué medir y cómo agruparlo, por ejemplo el promedio de IMC por categoría o las ausencias por mes, y ves el resultado al instante.',
        pantalla: 'insights-consulta',
      },
      {
        titulo: 'El presentismo, en números',
        texto:
          'Asistencia por categoría, por tipo de sesión o por semana: los datos que el entrenador carga en la cancha, convertidos en gráficos.',
        pantalla: 'presentismo-estadisticas',
      },
    ],
    faqs: [
      {
        pregunta: '¿Necesito saber programar para armar un tablero?',
        respuesta:
          'No. El constructor visual de Insights te deja elegir los datos, la métrica y el tipo de gráfico desde menús, sin escribir código.',
      },
      {
        pregunta: '¿Qué datos puedo analizar?',
        respuesta:
          'Insights analiza deportistas, seguimientos, antropometría, evaluaciones psicológicas, presentismo, turnos, convocatorias, triage y viandas.',
      },
      {
        pregunta: '¿Puedo exportar los datos?',
        respuesta: 'Sí. Cada gráfico de Insights se puede exportar a CSV para trabajarlo en una planilla.',
      },
      {
        pregunta: '¿Quién tiene acceso a Insights?',
        respuesta: 'Insights, el módulo de análisis de BioTeam, está disponible para la administración del club.',
      },
      {
        pregunta: '¿Los tableros muestran datos de otros clubes?',
        respuesta:
          'No. En Insights cada consulta se limita a los datos de tu club, con controles en la aplicación y en la base de datos.',
      },
    ],
  },
  {
    slug: 'branding-del-club',
    nombre: 'Tu club, tu marca',
    icono: 'Palette',
    resumen:
      'El logo y los colores de tu club en toda la app, y usuarios con roles para que cada área vea lo que necesita.',
    resumenRespuesta:
      'Cada club usa BioTeam con su propia marca: el administrador configura el nombre, el logo y los colores del club, que se aplican en toda la app, en el login y en el ícono del navegador. Además invita a su equipo por email, y cada persona entra con un rol (entrenador, médico, psicólogo, área social y más) que define qué ve.',
    seo: {
      titulo: 'Tu club, tu marca: usuarios, roles y branding | BioTeam',
      descripcion:
        'Personalizá BioTeam con el logo y los colores de tu club e invitá a tu equipo con roles: entrenadores, médicos, psicólogos, área social y más.',
    },
    eyebrow: 'Tu club, tu marca',
    h1: 'Software para clubes con tu marca, usuarios y roles',
    bajada:
      'Adentro de la app, tu equipo ve el nombre, el logo y los colores de tu club. Y cada persona entra con el rol que le corresponde.',
    pantallaHero: 'branding-configuracion',
    beneficios: [
      {
        titulo: 'Con la identidad de tu club',
        items: [
          'Nombre, logo y colores propios',
          'Colores sugeridos a partir del logo',
          'Vista previa antes de guardar',
          'Login e ícono del navegador con tu escudo',
        ],
      },
      {
        titulo: 'Roles por área',
        items: [
          'Administración, entrenadores y área social',
          'Médicos, kinesiólogos, cardiólogos, psicólogos y nutricionistas',
          'Responsables de viandas con su lugar de retiro',
        ],
      },
      {
        titulo: 'Control del acceso',
        items: [
          'Invitaciones por email',
          'Cambio de rol, baja y reactivación de usuarios',
          'Cada rol ve solo los módulos que usa',
        ],
      },
    ],
    pasos: [
      {
        titulo: 'Subís el logo',
        texto:
          'BioTeam detecta sus colores y te los sugiere como primario, secundario y acento. Los ajustás y ves la vista previa.',
      },
      {
        titulo: 'Invitás a tu equipo',
        texto: 'Cargás el nombre, el email y el rol de cada persona; le llega una invitación para entrar.',
      },
      {
        titulo: 'Cada uno trabaja en lo suyo',
        texto:
          'Según su rol, cada usuario ve en el menú solo los módulos que le corresponden.',
      },
    ],
    bloques: [
      {
        titulo: 'Usuarios y roles',
        texto:
          'Desde Usuarios ves quién tiene acceso, las invitaciones pendientes y el rol de cada persona, y lo cambiás cuando hace falta.',
        pantalla: 'usuarios-roles',
      },
      {
        titulo: 'Tu marca en cada pantalla',
        texto:
          'La ficha del deportista, los tableros y el menú usan los colores y el logo de tu club, no los de BioTeam.',
        pantalla: 'ficha-pestanas',
      },
    ],
    faqs: [
      {
        pregunta: '¿Qué puedo personalizar?',
        respuesta:
          'En BioTeam cada club personaliza su nombre, su logo (PNG, JPG, WebP o SVG) y tres colores: primario, secundario y acento. Se aplican en toda la app, en el login y en el ícono del navegador.',
      },
      {
        pregunta: '¿Qué roles hay?',
        respuesta:
          'BioTeam tiene estos roles: administrador, entrenador, médico, kinesiólogo, cardiólogo, psicólogo, nutricionista, social y responsable de viandas.',
      },
      {
        pregunta: '¿Cómo se suma alguien al equipo?',
        respuesta:
          'En BioTeam, un administrador del club invita a la persona por email con su rol. La invitación vence a los 30 días y se puede reenviar.',
      },
      {
        pregunta: '¿Qué pasa cuando alguien deja el club?',
        respuesta:
          'Un administrador deshabilita su usuario y la persona deja de tener acceso a BioTeam. Si vuelve, se reactiva su usuario sin perder lo que registró.',
      },
    ],
  },
];

export function paginaPorSlug(slug: string): PaginaFuncionalidad | undefined {
  return PAGINAS_FUNCIONALIDAD.find((p) => p.slug === slug);
}
