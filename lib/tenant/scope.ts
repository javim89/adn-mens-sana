/**
 * Cómo se acota cada modelo de Prisma a un club. Lo consume `dbDelClub`.
 *
 * - `raiz`: tiene `clubId` propio. Se filtra por `{ clubId }` y en los create se
 *   inyecta.
 * - `hijo`: no tiene `clubId`; se acota por la relación con su padre (o abuelo).
 *   `filtro` arma ese where.
 * - `global`: no pertenece a un club o lo maneja solo `lib/tenant`. El cliente
 *   acotado lo rechaza.
 *
 * `refs` son las FK que hay que validar en las escrituras: que la fila apuntada
 * sea del mismo club. `anidados` son las relaciones inversas (hijos) por las que
 * puede llegar un nested write; se recorren para inyectar el club y validar las
 * FK de los hijos.
 *
 * Al agregar un modelo al schema hay que clasificarlo acá: el tipo lo exige y
 * `__tests__/scope.test.ts` verifica contra `schema.prisma` que no falte ninguna
 * FK ni relación.
 */

import type { Prisma } from '@/lib/generated/prisma/client';
import { TenantScopeError } from './errores';

export type ModelName = Prisma.ModelName;

export type Ref = {
  /** FK escalar (`categoriaId`). */
  campo: string;
  /** Campo de relación que usa esa FK (`categoria`). */
  relacion: string;
  /** Modelo apuntado. */
  modelo: ModelName;
};

type Where = Record<string, unknown>;

type ConRelaciones = {
  refs: readonly Ref[];
  anidados: Readonly<Record<string, ModelName>>;
};

export type AlcanceRaiz = ConRelaciones & { tipo: 'raiz' };
export type AlcanceHijo = ConRelaciones & { tipo: 'hijo'; filtro: (clubId: string) => Where };
export type AlcanceGlobal = { tipo: 'global'; motivo: string };
export type Alcance = AlcanceRaiz | AlcanceHijo | AlcanceGlobal;

const ref = (campo: string, relacion: string, modelo: ModelName): Ref => ({ campo, relacion, modelo });

const raiz = (refs: Ref[] = [], anidados: Record<string, ModelName> = {}): AlcanceRaiz => ({
  tipo: 'raiz',
  refs,
  anidados,
});

const hijo = (
  filtro: (clubId: string) => Where,
  refs: Ref[],
  anidados: Record<string, ModelName> = {},
): AlcanceHijo => ({ tipo: 'hijo', filtro, refs, anidados });

const global = (motivo: string): AlcanceGlobal => ({ tipo: 'global', motivo });

// Filtros reutilizados por varios hijos.
const porDeportista = (clubId: string) => ({ deportista: { clubId } });
const porSeguimiento = (clubId: string) => ({ seguimiento: { clubId } });
const porDatosSalud = (clubId: string) => ({ datosSalud: { deportista: { clubId } } });
const porDashboard = (clubId: string) => ({ dashboard: { clubId } });

const aDeportista = ref('deportistaId', 'deportista', 'Deportista');
const aSeguimiento = ref('seguimientoId', 'seguimiento', 'Seguimiento');
const aCategoria = ref('categoriaId', 'categoria', 'Categoria');
const aDisciplina = ref('disciplinaId', 'disciplina', 'Disciplina');
const aDatosSalud = ref('datosSaludId', 'datosSalud', 'DatosSalud');
const aDashboard = ref('dashboardId', 'dashboard', 'InsightsDashboard');

export const TENANT_SCOPE = {
  // --- Multi-tenant ----------------------------------------------------------
  Club: global('Es el tenant mismo; lo administra superadmin.'),
  // Raíces: así las actions de usuarios no pueden tocar membresías de otro club.
  Membresia: raiz(),
  Invitacion: raiz(),
  Superadmin: global('Staff de BioTeam, no pertenece a un club.'),
  InsightsSesion: global('La crea y la limpia el runner de Insights con clubId explícito.'),

  // --- Deportista y satélites -----------------------------------------------
  Deportista: raiz([aDisciplina, aCategoria], {
    clubesAnteriores: 'ClubAnterior',
    historiaDeportiva: 'HistoriaDeportiva',
    turnosDeportista: 'TurnoDeportista',
    seguimientos: 'SeguimientoDeportista',
    asistencias: 'Asistencia',
    convocatorias: 'ConvocatoriaDeportista',
    pasosPorDivision: 'PasoPorDivision',
    triages: 'Triage',
    entregasComida: 'EntregaComida',
    datosEscolares: 'DatosEscolares',
    datosSociales: 'DatosSociales',
    viviendaFamiliar: 'ViviendaFamiliar',
    datosFamiliares: 'DatosFamiliares',
    necesidadesApoyo: 'NecesidadesApoyo',
    datosSalud: 'DatosSalud',
  }),
  ClubAnterior: hijo(porDeportista, [aDeportista]),
  HistoriaDeportiva: hijo(porDeportista, [aDeportista]),
  DatosEscolares: hijo(porDeportista, [aDeportista]),
  DatosSociales: hijo(porDeportista, [aDeportista]),
  DatosFamiliares: hijo(porDeportista, [aDeportista]),
  ViviendaFamiliar: hijo(porDeportista, [aDeportista], { servicios: 'ServicioVivienda' }),
  ServicioVivienda: hijo(
    (clubId) => ({ viviendaFamiliar: { deportista: { clubId } } }),
    [ref('viviendaFamiliarId', 'viviendaFamiliar', 'ViviendaFamiliar')],
  ),
  NecesidadesApoyo: hijo(porDeportista, [aDeportista], { apoyosRequeridos: 'ApoyoRequerido' }),
  ApoyoRequerido: hijo(
    (clubId) => ({ necesidadesApoyo: { deportista: { clubId } } }),
    [ref('necesidadesApoyoId', 'necesidadesApoyo', 'NecesidadesApoyo')],
  ),
  DatosSalud: hijo(porDeportista, [aDeportista], {
    enfermedadesPreexistentes: 'EnfermedadPreexistenteItem',
    antecedentesEnfermedadesFam: 'AntecedenteEnfermedadFamiliarItem',
  }),
  EnfermedadPreexistenteItem: hijo(porDatosSalud, [aDatosSalud]),
  AntecedenteEnfermedadFamiliarItem: hijo(porDatosSalud, [aDatosSalud]),

  // --- Turnos ----------------------------------------------------------------
  Turno: raiz([], { deportistas: 'TurnoDeportista' }),
  TurnoDeportista: hijo(
    (clubId) => ({ turno: { clubId } }),
    [ref('turnoId', 'turno', 'Turno'), aDeportista],
  ),

  // --- Seguimientos ----------------------------------------------------------
  Seguimiento: raiz([], {
    deportistas: 'SeguimientoDeportista',
    traumatologia: 'SeguimientoTraumatologia',
    historiaClinica: 'SeguimientoHistoriaClinica',
    evaluacionPsicologica: 'SeguimientoEvaluacionPsicologica',
    evaluacionCardiologica: 'SeguimientoEvaluacionCardiologica',
    antropometria: 'SeguimientoAntropometria',
  }),
  SeguimientoDeportista: hijo(porSeguimiento, [aSeguimiento, aDeportista]),
  SeguimientoTraumatologia: hijo(porSeguimiento, [aSeguimiento]),
  SeguimientoHistoriaClinica: hijo(porSeguimiento, [aSeguimiento]),
  SeguimientoEvaluacionPsicologica: hijo(porSeguimiento, [aSeguimiento]),
  SeguimientoEvaluacionCardiologica: hijo(porSeguimiento, [aSeguimiento]),
  SeguimientoAntropometria: hijo(porSeguimiento, [aSeguimiento]),

  // --- Calendario y catálogos ------------------------------------------------
  Equipo: raiz([], { eventosLocal: 'EventoTorneo', eventosVisitante: 'EventoTorneo' }),
  Categoria: raiz([], {
    eventos: 'EventoTorneo',
    deportistas: 'Deportista',
    disciplinas: 'DisciplinaCategoria',
    entrenamientos: 'Entrenamiento',
    convocatorias: 'Convocatoria',
    pasosPorDivision: 'PasoPorDivision',
  }),
  Disciplina: raiz([], {
    categorias: 'DisciplinaCategoria',
    deportistas: 'Deportista',
    entrenamientos: 'Entrenamiento',
    convocatorias: 'Convocatoria',
    pasosPorDivision: 'PasoPorDivision',
  }),
  DisciplinaCategoria: hijo((clubId) => ({ disciplina: { clubId } }), [aDisciplina, aCategoria]),
  DiaCalendario: raiz([], { eventos: 'EventoTorneo' }),
  EventoTorneo: raiz(
    [
      ref('diaCalendarioId', 'dia', 'DiaCalendario'),
      aCategoria,
      ref('localId', 'local', 'Equipo'),
      ref('visitanteId', 'visitante', 'Equipo'),
    ],
    { convocatoria: 'Convocatoria' },
  ),

  // --- Presentismo y convocatorias -------------------------------------------
  Entrenamiento: raiz([aDisciplina, aCategoria], { asistencias: 'Asistencia' }),
  Asistencia: hijo(
    (clubId) => ({ entrenamiento: { clubId } }),
    [ref('entrenamientoId', 'entrenamiento', 'Entrenamiento'), aDeportista],
  ),
  Convocatoria: raiz(
    [ref('eventoTorneoId', 'evento', 'EventoTorneo'), aDisciplina, aCategoria],
    { convocados: 'ConvocatoriaDeportista' },
  ),
  ConvocatoriaDeportista: hijo(
    (clubId) => ({ convocatoria: { clubId } }),
    [ref('convocatoriaId', 'convocatoria', 'Convocatoria'), aDeportista],
  ),

  // --- Trayectoria y triage --------------------------------------------------
  PasoPorDivision: hijo(porDeportista, [aDeportista, aCategoria, aDisciplina]),
  Triage: raiz([aDeportista]),

  // --- Insights --------------------------------------------------------------
  InsightsDashboard: raiz([], { widgets: 'InsightsWidget', filtros: 'InsightsFilter' }),
  InsightsWidget: hijo(porDashboard, [aDashboard], { filtros: 'InsightsFilterTarget' }),
  InsightsFilter: hijo(porDashboard, [aDashboard], { targets: 'InsightsFilterTarget' }),
  InsightsFilterTarget: hijo(
    (clubId) => ({ filter: { dashboard: { clubId } } }),
    [ref('filterId', 'filter', 'InsightsFilter'), ref('widgetId', 'widget', 'InsightsWidget')],
  ),

  // --- Viandas ---------------------------------------------------------------
  EntregaComida: raiz([aDeportista]),
} satisfies Record<ModelName, Alcance>;

/** El alcance del modelo, o `undefined` si no está clasificado. */
export function alcanceDe(modelo: string): Alcance | undefined {
  return (TENANT_SCOPE as Record<string, Alcance>)[modelo];
}

/** Where que deja solo las filas del club. Falla cerrado para global/sin clasificar. */
export function filtroDelClub(modelo: string, clubId: string): Where {
  const alcance = alcanceDe(modelo);
  if (alcance?.tipo === 'raiz') return { clubId };
  if (alcance?.tipo === 'hijo') return alcance.filtro(clubId);
  return lanzarSinAlcance(modelo, alcance);
}

function lanzarSinAlcance(modelo: string, alcance: Alcance | undefined): never {
  const motivo = alcance?.tipo === 'global' ? `es global (${alcance.motivo})` : 'no está clasificado';
  throw new TenantScopeError(`El modelo ${modelo} ${motivo}: no se puede usar con el cliente del club`);
}
