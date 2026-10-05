/**
 * Queries del dashboard. Una función por card-grupo, cada una tipada y testeable
 * sola con `prisma` mockeado.
 *
 * Tres reglas transversales, y las tres son bugs si se rompen:
 *
 * 1. **Los bordes de fecha son half-open** (`>= desde`, `< finExclusivo`), nunca
 *    `lte hasta`. Es uniforme entre columnas y es inmune a un componente de hora
 *    inesperado.
 * 2. **Casi todas las columnas de fecha usan `desdeDb`/`finExclusivoDb`** (medianoche
 *    UTC). `turnos.fecha`, `seguimientos.fecha` y `proxima_cita` son `DateTime` sin
 *    `@db.Date`, PERO se escriben con `new Date('YYYY-MM-DD')` desde un
 *    `<input type="date">` (`lib/actions/turnos.ts:60`, `lib/actions/seguimientos.ts:309`),
 *    o sea medianoche UTC igual que un `@db.Date`. El único timestamp real del
 *    dashboard es `triage.calculated_at`, y su query vive en `lib/queries/triage.ts`.
 * 3. **Cada query respeta el scoping de su módulo**, porque el número de la card
 *    tiene que coincidir con la lista que linkea: turnos por `profesionalId`,
 *    presentismo por `entrenadorId`, viandas por `lugar`, y **seguimientos GLOBAL**.
 *
 * Usa `prisma` de `lib/db.ts`, NO `getReadOnlyPrisma()`, que es exclusivo de Insights.
 */
import { prisma } from '@/lib/db';
import { Prisma } from '@/lib/generated/prisma/client';
import type {
  EstadoAsistencia,
  EstadoDeportista,
  LugarRetiro,
  PrioridadSeguimiento,
  TipoComida,
} from '@/lib/generated/prisma/enums';
import { CATEGORIAS_SIN_MERIENDA, COMIDAS } from '@/lib/utils/viandas';

/** Los dos bordes de una ventana de días, ya resueltos por `lib/utils/fecha.ts`. */
export interface RangoFechas {
  desdeDb: Date;
  finExclusivoDb: Date;
}

// ---------------------------------------------------------------------------
// Viandas
// ---------------------------------------------------------------------------

export interface ConteoComida {
  entregas: number;
  /** Almuerzos/cenas que la ficha NO prevé, y meriendas a categorías sin merienda. */
  fueraDeFicha: number;
}

export interface ResumenViandas {
  porComida: Record<TipoComida, ConteoComida>;
  totalEntregas: number;
  totalFueraDeFicha: number;
}

type FilaViandas = { comida: string; entregas: number; fuera_de_ficha: number };

/**
 * Entregas de la semana y cuántas cayeron fuera de lo que prevé la ficha.
 *
 * **Va en SQL crudo y no en `groupBy` por una razón concreta:** el predicado de
 * "fuera de ficha" **correlaciona la columna `comida` de la propia fila con dos
 * columnas de la tabla relacionada**, y un `where` de Prisma sobre una relación no
 * puede referirse al `comida` de la fila que está filtrando. Con `groupBy` harían
 * falta 3 round trips con el `COALESCE` replicado a mano en cada uno; traer todas
 * las entregas de la semana para agrupar en JS es traer miles de filas para
 * devolver cuatro números.
 *
 * **El `COALESCE(..., false)` no es cosmético**: un deportista sin fila en
 * `necesidades_apoyo` da NULL por el LEFT JOIN, y NULL no es `false` en una
 * comparación. Sin coalescer, el desvío quedaría invisible justo para el caso de
 * ficha incompleta, que es el más frecuente. Es el mismo `COALESCE` que
 * `lib/insights/catalog.ts:116-117`, así los dos números coinciden.
 *
 * **DESAYUNO da `fuera_de_ficha = 0` por construcción del `FILTER`**: es de todo
 * el plantel y nunca es anomalía. **MERIENDA solo lo es para las categorías de
 * `CATEGORIAS_SIN_MERIENDA`**, que reciben solo desayuno; por eso el join a
 * `deportistas`/`categorias`. La lista entra como parámetros desde
 * `lib/utils/viandas.ts` (la misma que usa `/viandas`) para que el número de la
 * card y el de la pantalla no se desincronicen. Un deportista sin categoría da
 * `c.nombre` NULL, y `NULL IN (...)` no es verdadero: sin categoría la merienda
 * no es anomalía, igual que `recibeMerienda(null)`. La regla queda declarativa
 * en el SQL en vez de ser un `if` en la UI, y por lo tanto testeable.
 *
 * NO es una lista de errores: `/viandas` deja entregar cualquier comida a
 * cualquiera a propósito, porque la ficha puede estar incompleta. Es una señal de
 * supervisión, y el copy de la card lo dice.
 */
export async function getResumenViandas(params: {
  rango: RangoFechas;
  /** Solo para `responsable_viandas`: el admin ve todos los lugares. */
  lugar?: LugarRetiro | null;
}): Promise<ResumenViandas> {
  const { rango, lugar } = params;

  // `e.lugar::text = $n` y no `e.lugar = $n`: el driver tipa el parámetro como
  // texto y Postgres no compara un enum con text sin cast. Castear la columna es
  // más robusto que nombrar el tipo del enum, que es un detalle de la migración.
  // El prefijo `fecha` del índice `@@index([fecha, lugar])` se sigue usando.
  const filtroLugar = lugar ? Prisma.sql`AND e.lugar::text = ${lugar}` : Prisma.empty;

  const filas = await prisma.$queryRaw<FilaViandas[]>(Prisma.sql`
    SELECT e.comida::text AS comida,
           COUNT(*)::int  AS entregas,
           COUNT(*) FILTER (
             WHERE (e.comida = 'ALMUERZO' AND COALESCE(na.recibe_almuerzo, false) = false)
                OR (e.comida = 'CENA'     AND COALESCE(na.recibe_cena,     false) = false)
                OR (e.comida = 'MERIENDA' AND c.nombre IN (${Prisma.join([...CATEGORIAS_SIN_MERIENDA])}))
           )::int AS fuera_de_ficha
    FROM entregas_comida e
    LEFT JOIN necesidades_apoyo na ON na.deportista_id = e.deportista_id
    LEFT JOIN deportistas d ON d.id = e.deportista_id
    LEFT JOIN categorias c ON c.id = d.categoria_id
    WHERE e.fecha >= ${rango.desdeDb} AND e.fecha < ${rango.finExclusivoDb}
    ${filtroLugar}
    GROUP BY e.comida
  `);

  // Zero-fill desde COMIDAS: las cuatro comidas siempre están, en cero si no hubo.
  const porComida = Object.fromEntries(
    COMIDAS.map((c) => [c, { entregas: 0, fueraDeFicha: 0 }]),
  ) as Record<TipoComida, ConteoComida>;

  let totalEntregas = 0;
  let totalFueraDeFicha = 0;

  for (const fila of filas) {
    const comida = fila.comida as TipoComida;
    if (!(comida in porComida)) continue;
    porComida[comida] = { entregas: fila.entregas, fueraDeFicha: fila.fuera_de_ficha };
    totalEntregas += fila.entregas;
    totalFueraDeFicha += fila.fuera_de_ficha;
  }

  return { porComida, totalEntregas, totalFueraDeFicha };
}

// ---------------------------------------------------------------------------
// Turnos
// ---------------------------------------------------------------------------

export interface TurnoProximo {
  id: string;
  titulo: string;
  fecha: Date;
  hora: string;
  lugar: string;
  deportistas: { id: string; nombre: string; apellido: string }[];
}

export interface ResumenTurnos {
  totalSemana: number;
  proximos: TurnoProximo[];
}

/**
 * Turnos de la semana + los próximos, que la card muestra INLINE.
 *
 * Son inline y no un deep link porque `/turnos` expone `?page&area&q` y **no** un
 * filtro por rango de fechas: un link a `/turnos` mostraría un conjunto distinto
 * del número de la card. La card muestra el total y las filas concretas que contó,
 * y el footer lleva label honesto ("Ver todos los turnos").
 *
 * **Scoping**: admin ve todos; no-admin **solo los propios**, igual que
 * `app/(app)/turnos/page.tsx:34`.
 */
export async function getResumenTurnos(params: {
  rango: RangoFechas;
  /** Medianoche UTC de hoy: los "próximos" arrancan hoy, no el lunes. */
  desdeHoyDb: Date;
  /** `undefined` = admin (todos). Presente = solo los turnos de ese profesional. */
  profesionalId?: string;
  limite?: number;
}): Promise<ResumenTurnos> {
  const { rango, desdeHoyDb, profesionalId, limite = 5 } = params;
  const scope = profesionalId ? { profesionalId } : {};

  const [totalSemana, proximos] = await Promise.all([
    prisma.turno.count({
      where: {
        ...scope,
        fecha: { gte: rango.desdeDb, lt: rango.finExclusivoDb },
      },
    }),
    prisma.turno.findMany({
      where: { ...scope, fecha: { gte: desdeHoyDb } },
      select: {
        id: true,
        titulo: true,
        fecha: true,
        hora: true,
        lugar: true,
        deportistas: {
          select: { deportista: { select: { id: true, nombre: true, apellido: true } } },
        },
      },
      orderBy: [{ fecha: 'asc' }, { hora: 'asc' }],
      take: limite,
    }),
  ]);

  return {
    totalSemana,
    proximos: proximos.map((t) => ({
      id: t.id,
      titulo: t.titulo,
      fecha: t.fecha,
      hora: t.hora,
      lugar: t.lugar,
      deportistas: t.deportistas.map((td) => td.deportista),
    })),
  };
}

// ---------------------------------------------------------------------------
// Presentismo
// ---------------------------------------------------------------------------

/**
 * LA DEFINICIÓN DE PRESENTISMO, fijada por escrito porque es una decisión de
 * negocio y no un detalle de implementación:
 *
 *   presentismo = (PRESENTE + LLEGO_TARDE + SE_RETIRO_ANTES) / total de registros
 *
 * O sea **"no ausente"**: llegar tarde y retirarse antes **son** asistencias. Si se
 * definiera distinto el número cambiaría y nadie sabría por qué, así que tiene su
 * propio test.
 */
const ESTADOS_PRESENTES = ['PRESENTE', 'LLEGO_TARDE', 'SE_RETIRO_ANTES'] as const;

const ESTADOS_ASISTENCIA = ['PRESENTE', 'LLEGO_TARDE', 'SE_RETIRO_ANTES', 'AUSENTE'] as const;

const DIAS_SEMANA = 7;

export interface PresentismoSemana {
  registros: number;
  asistencias: number;
  /** `null` cuando no hubo ningún registro: sin denominador no hay porcentaje, nunca NaN. */
  porcentaje: number | null;
  /**
   * Registros por estado, con zero-fill de los 4. Va en las dos semanas (no solo en
   * `actual`) porque sale gratis del mismo `groupBy` y mantiene un único tipo.
   */
  porEstado: Record<EstadoAsistencia, number>;
}

/** Un día de la semana actual. Misma definición de presente que el semanal. */
export interface PresentismoDia {
  /** `YYYY-MM-DD` (fecha `@db.Date`, medianoche UTC). */
  clave: string;
  registros: number;
  asistencias: number;
  /** `null` si ese día no hubo registros: nunca NaN ni un 0% mentiroso. */
  porcentaje: number | null;
}

export interface DeportistaAusencias {
  id: string;
  nombre: string;
  apellido: string;
  ausencias: number;
}

export interface ResumenPresentismo {
  actual: PresentismoSemana;
  previo: PresentismoSemana;
  /** 2+ ausencias en la semana: es un factor del scoring de triage, así que conecta las dos métricas. */
  ausentismoReiterado: DeportistaAusencias[];
  /** Semana actual día por día: SIEMPRE 7 elementos, lunes a domingo de `rango`. */
  porDia: PresentismoDia[];
}

type FilaPresentismoDia = { clave: string; registros: number; asistencias: number };

function porcentaje(asistencias: number, registros: number): number | null {
  return registros === 0 ? null : Math.round((asistencias / registros) * 100);
}

function porcentajeAsistencia(
  grupos: { estado: string; _count: { _all: number } }[],
): PresentismoSemana {
  const porEstado = Object.fromEntries(
    ESTADOS_ASISTENCIA.map((e) => [e, 0]),
  ) as Record<EstadoAsistencia, number>;

  let registros = 0;
  let asistencias = 0;
  for (const g of grupos) {
    registros += g._count._all;
    if (g.estado in porEstado) porEstado[g.estado as EstadoAsistencia] = g._count._all;
    if ((ESTADOS_PRESENTES as readonly string[]).includes(g.estado)) {
      asistencias += g._count._all;
    }
  }
  return { registros, asistencias, porcentaje: porcentaje(asistencias, registros), porEstado };
}

function presentismoPorDia(desdeDb: Date, filas: FilaPresentismoDia[]): PresentismoDia[] {
  const porClave = new Map(filas.map((f) => [f.clave, f]));
  return Array.from({ length: DIAS_SEMANA }, (_, i) => {
    const clave = new Date(desdeDb.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    const fila = porClave.get(clave);
    const registros = fila?.registros ?? 0;
    const asistencias = fila?.asistencias ?? 0;
    return { clave, registros, asistencias, porcentaje: porcentaje(asistencias, registros) };
  });
}

/**
 * Presentismo de la semana, el de la anterior, quiénes acumulan 2+ ausencias, el
 * desglose por estado (`porEstado`, del mismo `groupBy`) y la semana actual día por
 * día (`porDia`).
 *
 * `Asistencia` no tiene fecha propia: cuelga de `entrenamiento.fecha`, que es
 * `@db.Date`. El scoping por `entrenadorId` también va sobre el entrenamiento,
 * igual que `getEntrenamientos` (`lib/queries/presentismo.ts:35`).
 *
 * `porDia` va en SQL crudo porque `groupBy` de Prisma no agrupa por una columna de
 * la relación. La clave sale de `to_char` en SQL y no de un `Date` del driver, así
 * no depende de cómo deserializa un `date` ni de la zona horaria del proceso. Los
 * estados presentes se pasan como parámetros desde `ESTADOS_PRESENTES`: una sola
 * definición para el semanal y el diario. Los 7 días se completan en JS.
 */
export async function getResumenPresentismo(params: {
  rango: RangoFechas;
  rangoPrevio: RangoFechas;
  /** `undefined` = admin (todos los entrenadores). */
  entrenadorId?: string;
}): Promise<ResumenPresentismo> {
  const { rango, rangoPrevio, entrenadorId } = params;
  const scope = entrenadorId ? { entrenadorId } : {};

  const whereSemana = {
    entrenamiento: {
      ...scope,
      fecha: { gte: rango.desdeDb, lt: rango.finExclusivoDb },
    },
  };

  const filtroEntrenador = entrenadorId
    ? Prisma.sql`AND en.entrenador_id = ${entrenadorId}`
    : Prisma.empty;

  const [gruposActual, gruposPrevio, ausentes, filasPorDia] = await Promise.all([
    prisma.asistencia.groupBy({
      by: ['estado'],
      where: whereSemana,
      _count: { _all: true },
    }),
    prisma.asistencia.groupBy({
      by: ['estado'],
      where: {
        entrenamiento: {
          ...scope,
          fecha: { gte: rangoPrevio.desdeDb, lt: rangoPrevio.finExclusivoDb },
        },
      },
      _count: { _all: true },
    }),
    // El `having` empuja el "2 o más" a SQL: sin él volvería una fila por cada
    // deportista con una sola ausencia, que es casi todo el plantel.
    prisma.asistencia.groupBy({
      by: ['deportistaId'],
      where: { ...whereSemana, estado: 'AUSENTE' },
      _count: { deportistaId: true },
      having: { deportistaId: { _count: { gte: 2 } } },
      orderBy: { _count: { deportistaId: 'desc' } },
    }),
    prisma.$queryRaw<FilaPresentismoDia[]>(Prisma.sql`
      SELECT to_char(en.fecha, 'YYYY-MM-DD') AS clave,
             COUNT(*)::int AS registros,
             COUNT(*) FILTER (
               WHERE a.estado::text IN (${Prisma.join([...ESTADOS_PRESENTES])})
             )::int AS asistencias
      FROM asistencias a
      JOIN entrenamientos en ON en.id = a.entrenamiento_id
      WHERE en.fecha >= ${rango.desdeDb} AND en.fecha < ${rango.finExclusivoDb}
      ${filtroEntrenador}
      GROUP BY en.fecha
    `),
  ]);

  let ausentismoReiterado: DeportistaAusencias[] = [];
  if (ausentes.length > 0) {
    const nombres = await prisma.deportista.findMany({
      where: { id: { in: ausentes.map((a) => a.deportistaId) } },
      select: { id: true, nombre: true, apellido: true },
    });
    const porId = new Map(nombres.map((d) => [d.id, d]));
    ausentismoReiterado = ausentes.flatMap((a) => {
      const d = porId.get(a.deportistaId);
      return d ? [{ ...d, ausencias: a._count.deportistaId }] : [];
    });
  }

  return {
    actual: porcentajeAsistencia(gruposActual),
    previo: porcentajeAsistencia(gruposPrevio),
    ausentismoReiterado,
    porDia: presentismoPorDia(rango.desdeDb, filasPorDia),
  };
}

// ---------------------------------------------------------------------------
// Seguimientos
// ---------------------------------------------------------------------------

export interface CitaProxima {
  id: string;
  titulo: string;
  proximaCita: Date;
  deportistas: { id: string; nombre: string; apellido: string }[];
}

export interface ResumenSeguimientos {
  /** Backlog abierto por prioridad, con zero-fill de las 4. NO acotado a la semana. */
  porPrioridad: Record<PrioridadSeguimiento, number>;
  /** Suma de `porPrioridad`: todo el backlog abierto. */
  total: number;
  /** Derivado de `porPrioridad.ALTA`; se mantiene para los consumidores existentes. */
  alta: number;
  /** Derivado de `porPrioridad.URGENTE`; se mantiene para los consumidores existentes. */
  urgente: number;
  proximasCitas: CitaProxima[];
}

const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'] as const;

/**
 * Seguimientos que requieren atención.
 *
 * Un solo `groupBy` por prioridad da la distribución completa (`porPrioridad`, con
 * zero-fill) y el `total`. **Cada prioridad es un número separado con su propio
 * link** (`alta`/`urgente` se derivan de ahí): el filtro `?prioridad=` del listado
 * acepta un solo valor, así que una suma de dos prioridades no tendría a dónde
 * linkear sin romper la regla de que el número coincida con la lista.
 *
 * Los conteos son **backlog abierto**, no de la semana, que es lo que muestra
 * `/seguimientos?prioridad=ALTA`.
 *
 * **Scoping: NINGUNO.** Todos los roles ven todos los seguimientos — la propiedad
 * del registro solo gobierna editar y borrar (`app/(app)/seguimientos/page.tsx:45`).
 * Pasar un `profesionalId` acá sería el error inverso al de turnos.
 *
 * **Hueco del modelo, declarado:** `Seguimiento` no tiene flag de "cumplida", así
 * que una `proximaCita` pasada nunca se puede cerrar y el conteo crecería para
 * siempre. Por eso se acota a `diasVencidas` hacia atrás, y por eso el rótulo de la
 * UI tiene que ser preciso — *"citas cuya fecha ya pasó"*, **nunca** "citas perdidas".
 */
export async function getResumenSeguimientos(params: {
  /** Medianoche UTC de hoy. Separa las vencidas de las que vienen. */
  desdeHoyDb: Date;
  diasVencidas?: number;
  diasFuturas?: number;
  limite?: number;
}): Promise<ResumenSeguimientos> {
  const { desdeHoyDb, diasVencidas = 90, diasFuturas = 7, limite = 6 } = params;

  const desde = new Date(desdeHoyDb.getTime() - diasVencidas * 86_400_000);
  // +1 día para que el último día del rango entre completo con un borde exclusivo.
  const finExclusivo = new Date(desdeHoyDb.getTime() + (diasFuturas + 1) * 86_400_000);

  const [grupos, citas] = await Promise.all([
    prisma.seguimiento.groupBy({ by: ['prioridad'], _count: { _all: true } }),
    prisma.seguimiento.findMany({
      where: { proximaCita: { gte: desde, lt: finExclusivo } },
      select: {
        id: true,
        titulo: true,
        proximaCita: true,
        deportistas: {
          select: { deportista: { select: { id: true, nombre: true, apellido: true } } },
        },
      },
      orderBy: { proximaCita: 'asc' },
      take: limite,
    }),
  ]);

  const porPrioridad = Object.fromEntries(
    PRIORIDADES.map((p) => [p, 0]),
  ) as Record<PrioridadSeguimiento, number>;

  let total = 0;
  for (const g of grupos) {
    if (!(g.prioridad in porPrioridad)) continue;
    porPrioridad[g.prioridad] = g._count._all;
    total += g._count._all;
  }

  return {
    porPrioridad,
    total,
    alta: porPrioridad.ALTA,
    urgente: porPrioridad.URGENTE,
    proximasCitas: citas.flatMap((s) =>
      s.proximaCita
        ? [
            {
              id: s.id,
              titulo: s.titulo,
              proximaCita: s.proximaCita,
              deportistas: s.deportistas.map((sd) => sd.deportista),
            },
          ]
        : [],
    ),
  };
}

// ---------------------------------------------------------------------------
// Plantel
// ---------------------------------------------------------------------------

export type ResumenPlantel = {
  porEstado: Record<EstadoDeportista, number>;
  total: number;
};

const ESTADOS_DEPORTISTA = ['ACTIVO', 'LESIONADO', 'SUSPENDIDO', 'INACTIVO'] as const;

/** Plantel por estado. Cada estado linkea a `?filter[estado]=<ESTADO>`, que la API ya acepta. */
export async function getResumenPlantel(): Promise<ResumenPlantel> {
  const grupos = await prisma.deportista.groupBy({
    by: ['estado'],
    _count: { _all: true },
  });

  const porEstado = Object.fromEntries(
    ESTADOS_DEPORTISTA.map((e) => [e, 0]),
  ) as Record<EstadoDeportista, number>;

  let total = 0;
  for (const g of grupos) {
    if (!(g.estado in porEstado)) continue;
    porEstado[g.estado] = g._count._all;
    total += g._count._all;
  }

  return { porEstado, total };
}

// ---------------------------------------------------------------------------
// Calendario
// ---------------------------------------------------------------------------

export interface EventoProximo {
  id: string;
  fecha: Date;
  categoria: string;
  local: string;
  visitante: string;
  estado: string;
  /** Si ya tiene convocatoria armada. Es la parte accionable de la fila. */
  tieneConvocatoria: boolean;
}

/**
 * Próximos eventos del calendario, desde hoy.
 *
 * `EventoTorneo` no tiene fecha propia: cuelga de `dia.fecha` (`@db.Date`), y por
 * eso tanto el filtro como el orden van a través de la relación.
 */
export async function getProximosEventos(params: {
  desdeHoyDb: Date;
  limite?: number;
}): Promise<EventoProximo[]> {
  const { desdeHoyDb, limite = 5 } = params;

  const eventos = await prisma.eventoTorneo.findMany({
    where: { dia: { fecha: { gte: desdeHoyDb } } },
    select: {
      id: true,
      estado: true,
      dia: { select: { fecha: true } },
      categoria: { select: { nombre: true } },
      local: { select: { nombre: true } },
      visitante: { select: { nombre: true } },
      convocatoria: { select: { id: true } },
    },
    orderBy: { dia: { fecha: 'asc' } },
    take: limite,
  });

  return eventos.map((e) => ({
    id: e.id,
    fecha: e.dia.fecha,
    categoria: e.categoria.nombre,
    local: e.local.nombre,
    visitante: e.visitante.nombre,
    estado: e.estado,
    tieneConvocatoria: e.convocatoria !== null,
  }));
}
