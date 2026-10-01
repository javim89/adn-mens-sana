import { describe, test, expect, vi, beforeEach } from 'vitest';
import React from 'react';

/**
 * EL TEST QUE PROTEGE LA PROPIEDAD CENTRAL DEL DASHBOARD:
 *
 *   una card que un rol no puede ver **no ejecuta su query**.
 *
 * No alcanza con verificar que no se pinta. El diseño es estructural — la query vive
 * DENTRO del componente de la sección, así que "no monto la sección" implica "no
 * consulto la base" — y este test verifica las dos mitades:
 *
 * 1. Qué secciones montó la page para cada rol (recorriendo el árbol de elementos).
 * 2. Que al ejecutar TODAS las secciones montadas, las queries de las cards ocultas
 *    siguen sin haberse llamado.
 *
 * El paso 2 es el que ataría la sección a su query: si alguien moviera un `await` a
 * `page.tsx`, la query se llamaría sin que ninguna sección esté montada y este test
 * fallaría.
 */
const { mockQueries, mockTriage, mockClerk } = vi.hoisted(() => ({
  mockQueries: {
    getResumenViandas: vi.fn(),
    getResumenTurnos: vi.fn(),
    getResumenPresentismo: vi.fn(),
    getResumenSeguimientos: vi.fn(),
    getResumenPlantel: vi.fn(),
    getProximosEventos: vi.fn(),
  },
  mockTriage: { getDistribucionTriage: vi.fn() },
  mockClerk: { auth: vi.fn(), currentUser: vi.fn() },
}));

vi.mock('@/lib/queries/dashboard', () => mockQueries);
vi.mock('@/lib/queries/triage', () => mockTriage);
vi.mock('@clerk/nextjs/server', () => mockClerk);

import DashboardPage from '../page';

/** Qué query pertenece a cada sección. Es el mapa que el test verifica. */
const QUERY_DE_SECCION = {
  SeccionTriage: mockTriage.getDistribucionTriage,
  SeccionViandas: mockQueries.getResumenViandas,
  SeccionTurnos: mockQueries.getResumenTurnos,
  SeccionPresentismo: mockQueries.getResumenPresentismo,
  SeccionSeguimientos: mockQueries.getResumenSeguimientos,
  SeccionPlantel: mockQueries.getResumenPlantel,
  SeccionEventos: mockQueries.getProximosEventos,
} as const;

type NombreSeccion = keyof typeof QUERY_DE_SECCION;

const TODAS_LAS_SECCIONES = Object.keys(QUERY_DE_SECCION) as NombreSeccion[];

/** Una sección es un RSC async: recibe props y devuelve el árbol ya resuelto. */
type SeccionAsync = (props: object) => Promise<unknown>;

interface SeccionMontada {
  nombre: NombreSeccion;
  componente: SeccionAsync;
  props: object;
}

/** Recorre el árbol de elementos y junta las secciones montadas con sus props. */
function buscarSecciones(
  nodo: React.ReactNode,
  encontradas: SeccionMontada[] = [],
): SeccionMontada[] {
  if (Array.isArray(nodo)) {
    for (const hijo of nodo) buscarSecciones(hijo, encontradas);
    return encontradas;
  }
  if (!React.isValidElement(nodo)) return encontradas;

  const tipo = nodo.type as { name?: string };
  const props = nodo.props as { children?: React.ReactNode };

  if (typeof nodo.type === 'function' && tipo.name && tipo.name in QUERY_DE_SECCION) {
    encontradas.push({
      nombre: tipo.name as NombreSeccion,
      componente: nodo.type as unknown as SeccionAsync,
      props,
    });
  }

  if (props?.children) buscarSecciones(props.children, encontradas);
  return encontradas;
}

/** Monta la page para un rol y devuelve los nombres de las secciones presentes. */
async function seccionesDe(
  role: string | undefined,
  extraMeta: object = {},
): Promise<NombreSeccion[]> {
  mockClerk.currentUser.mockResolvedValue(
    role === undefined ? null : { publicMetadata: { role, ...extraMeta } },
  );
  const arbol = await DashboardPage();
  return buscarSecciones(arbol).map((s) => s.nombre);
}

/** Monta la page y EJECUTA todas las secciones, para ver qué queries se disparan. */
async function ejecutarSecciones(role: string | undefined, extraMeta: object = {}) {
  mockClerk.currentUser.mockResolvedValue(
    role === undefined ? null : { publicMetadata: { role, ...extraMeta } },
  );
  const arbol = await DashboardPage();
  const secciones = buscarSecciones(arbol);
  for (const s of secciones) await s.componente(s.props);
  return secciones.map((s) => s.nombre);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockClerk.auth.mockResolvedValue({ userId: 'user_1' });
  mockTriage.getDistribucionTriage.mockResolvedValue({
    actual: { VERDE: 0, AMARILLO: 0, NARANJA: 0, ROJO: 0 },
    previo: null,
    ultimoPrevio: null,
    totalConTriage: 0,
    sinCalcular: 0,
    totalActivos: 0,
  });
  mockQueries.getResumenViandas.mockResolvedValue({
    porComida: {
      DESAYUNO: { entregas: 0, fueraDeFicha: 0 },
      ALMUERZO: { entregas: 0, fueraDeFicha: 0 },
      MERIENDA: { entregas: 0, fueraDeFicha: 0 },
      CENA: { entregas: 0, fueraDeFicha: 0 },
    },
    totalEntregas: 0,
    totalFueraDeFicha: 0,
  });
  mockQueries.getResumenTurnos.mockResolvedValue({ totalSemana: 0, proximos: [] });
  mockQueries.getResumenPresentismo.mockResolvedValue({
    actual: {
      registros: 0,
      asistencias: 0,
      porcentaje: null,
      porEstado: { PRESENTE: 0, LLEGO_TARDE: 0, SE_RETIRO_ANTES: 0, AUSENTE: 0 },
    },
    previo: {
      registros: 0,
      asistencias: 0,
      porcentaje: null,
      porEstado: { PRESENTE: 0, LLEGO_TARDE: 0, SE_RETIRO_ANTES: 0, AUSENTE: 0 },
    },
    ausentismoReiterado: [],
    porDia: [
      '2026-03-09',
      '2026-03-10',
      '2026-03-11',
      '2026-03-12',
      '2026-03-13',
      '2026-03-14',
      '2026-03-15',
    ].map((clave) => ({ clave, registros: 0, asistencias: 0, porcentaje: null })),
  });
  mockQueries.getResumenSeguimientos.mockResolvedValue({
    porPrioridad: { BAJA: 0, MEDIA: 0, ALTA: 0, URGENTE: 0 },
    total: 0,
    alta: 0,
    urgente: 0,
    proximasCitas: [],
  });
  mockQueries.getResumenPlantel.mockResolvedValue({
    porEstado: { ACTIVO: 0, LESIONADO: 0, SUSPENDIDO: 0, INACTIVO: 0 },
    total: 0,
  });
  mockQueries.getProximosEventos.mockResolvedValue([]);
});

describe('DashboardPage — qué secciones monta cada rol', () => {
  test('admin monta las 7 secciones', async () => {
    expect((await seccionesDe('admin')).sort()).toEqual([...TODAS_LAS_SECCIONES].sort());
  });

  test('entrenador monta presentismo pero no viandas ni turnos', async () => {
    const s = await seccionesDe('entrenador');
    expect(s).toContain('SeccionPresentismo');
    expect(s).not.toContain('SeccionViandas');
    expect(s).not.toContain('SeccionTurnos');
  });

  test('medico monta turnos pero no presentismo ni viandas', async () => {
    const s = await seccionesDe('medico');
    expect(s).toContain('SeccionTurnos');
    expect(s).not.toContain('SeccionPresentismo');
    expect(s).not.toContain('SeccionViandas');
  });

  test('responsable_viandas monta SOLO la sección de viandas', async () => {
    expect(await seccionesDe('responsable_viandas')).toEqual(['SeccionViandas']);
  });

  test('social no monta viandas, turnos ni presentismo', async () => {
    const s = await seccionesDe('social');
    expect(s.sort()).toEqual([
      'SeccionEventos',
      'SeccionPlantel',
      'SeccionSeguimientos',
      'SeccionTriage',
    ]);
  });
});

/**
 * El corazón del gating. Para cada rol se ejecutan TODAS las secciones montadas y se
 * verifica que las queries de las cards ocultas sigan intactas.
 */
describe('DashboardPage — las queries de las cards ocultas NO se ejecutan', () => {
  const ESPERADAS: Record<string, NombreSeccion[]> = {
    admin: TODAS_LAS_SECCIONES,
    entrenador: [
      'SeccionTriage',
      'SeccionPresentismo',
      'SeccionSeguimientos',
      'SeccionPlantel',
      'SeccionEventos',
    ],
    medico: [
      'SeccionTriage',
      'SeccionTurnos',
      'SeccionSeguimientos',
      'SeccionPlantel',
      'SeccionEventos',
    ],
    social: ['SeccionTriage', 'SeccionSeguimientos', 'SeccionPlantel', 'SeccionEventos'],
    responsable_viandas: ['SeccionViandas'],
  };

  test.each(Object.keys(ESPERADAS))('rol %s', async (rol) => {
    // El lugar es necesario para que la sección de viandas llegue a consultar: un
    // responsable SIN lugar corta antes del await (ver el test de más abajo).
    await ejecutarSecciones(rol, { lugarRetiro: 'SEDE' });

    const visibles = ESPERADAS[rol];
    for (const nombre of TODAS_LAS_SECCIONES) {
      const query = QUERY_DE_SECCION[nombre];
      if (visibles.includes(nombre)) {
        expect(query, `${nombre} debería haber consultado`).toHaveBeenCalled();
      } else {
        expect(query, `${nombre} NO debería haber consultado`).not.toHaveBeenCalled();
      }
    }
  });

  /**
   * El caso más sensible: `responsable_viandas` no puede ver datos de salud ni del
   * plantel. Si alguna de esas queries corriera, el conteo viajaría al HTML aunque no
   * se pinte.
   */
  test('responsable_viandas no toca NINGUNA query fuera de viandas', async () => {
    await ejecutarSecciones('responsable_viandas', { lugarRetiro: 'SEDE' });

    expect(mockQueries.getResumenViandas).toHaveBeenCalledTimes(1);
    expect(mockTriage.getDistribucionTriage).not.toHaveBeenCalled();
    expect(mockQueries.getResumenTurnos).not.toHaveBeenCalled();
    expect(mockQueries.getResumenPresentismo).not.toHaveBeenCalled();
    expect(mockQueries.getResumenSeguimientos).not.toHaveBeenCalled();
    expect(mockQueries.getResumenPlantel).not.toHaveBeenCalled();
    expect(mockQueries.getProximosEventos).not.toHaveBeenCalled();
  });

  /**
   * Un `responsable_viandas` SIN lugar asignado monta la sección pero **no consulta
   * la base**: el guard va antes del `await`. La alternativa habría sido mostrarle
   * números globales de todos los lugares, que es peor que no mostrar nada — vería
   * entregas de sedes que no opera y creería que son suyas.
   */
  test('un responsable sin lugar asignado monta la sección pero no consulta', async () => {
    const montadas = await ejecutarSecciones('responsable_viandas');

    expect(montadas).toEqual(['SeccionViandas']);
    expect(mockQueries.getResumenViandas).not.toHaveBeenCalled();
  });

  // Rol desconocido: cero secciones y cero queries. Es el fallback de
  // `getNavItemsForRole`, y no puede filtrar nada.
  test.each([undefined, 'cualquier-cosa', ''])(
    'el rol %o no ejecuta ninguna query',
    async (rol) => {
      expect(await ejecutarSecciones(rol as string | undefined)).toEqual([]);

      for (const query of Object.values(QUERY_DE_SECCION)) {
        expect(query).not.toHaveBeenCalled();
      }
    },
  );
});

/**
 * La organización visual: cada sección va envuelta en su `<BloqueDashboard>`, y el
 * rótulo se arma en `page.tsx` — no adentro de la sección. Eso es lo que hace que los
 * encabezados se pinten antes de que resuelva ninguna query.
 *
 * El test lo verifica SIN ejecutar las secciones: si alguien mudara el título adentro
 * del componente de la sección, el árbol sin resolver quedaría sin rótulos y esto
 * fallaría.
 */
describe('DashboardPage — un bloque rotulado por módulo', () => {
  interface Bloque {
    id: string;
    titulo: string;
    descripcion: string;
  }

  /** Junta los `<BloqueDashboard>` del árbol, en orden de aparición. */
  function buscarBloques(nodo: React.ReactNode, encontrados: Bloque[] = []): Bloque[] {
    if (Array.isArray(nodo)) {
      for (const hijo of nodo) buscarBloques(hijo, encontrados);
      return encontrados;
    }
    if (!React.isValidElement(nodo)) return encontrados;

    const tipo = nodo.type as { name?: string };
    const props = nodo.props as Bloque & { children?: React.ReactNode };

    if (typeof nodo.type === 'function' && tipo.name === 'BloqueDashboard') {
      encontrados.push({
        id: props.id,
        titulo: props.titulo,
        descripcion: props.descripcion,
      });
    }

    if (props?.children) buscarBloques(props.children, encontrados);
    return encontrados;
  }

  async function bloquesDe(role: string | undefined) {
    mockClerk.currentUser.mockResolvedValue(
      role === undefined ? null : { publicMetadata: { role } },
    );
    return buscarBloques(await DashboardPage());
  }

  test('el admin ve los 7 bloques, en orden', async () => {
    expect((await bloquesDe('admin')).map((b) => b.titulo)).toEqual([
      'Triage',
      'Viandas',
      'Turnos',
      'Presentismo',
      'Seguimientos',
      'Plantel',
      'Calendario',
    ]);
  });

  /**
   * Un bloque sin sección adentro sería un rótulo que nunca se llena, y una sección
   * sin bloque sería una grilla suelta sin nombre: las dos mitades tienen que ir
   * siempre juntas, para todos los roles.
   */
  test.each(['admin', 'entrenador', 'medico', 'social', 'responsable_viandas'])(
    'rol %s: hay exactamente un bloque por sección montada',
    async (rol) => {
      mockClerk.currentUser.mockResolvedValue({ publicMetadata: { role: rol } });
      const arbol = await DashboardPage();

      expect(buscarBloques(arbol)).toHaveLength(buscarSecciones(arbol).length);
    },
  );

  test('cada bloque tiene id, título y descripción no vacíos', async () => {
    for (const bloque of await bloquesDe('admin')) {
      expect(bloque.id, `el bloque ${bloque.titulo} necesita id`).toBeTruthy();
      expect(bloque.titulo).toBeTruthy();
      expect(bloque.descripcion).toBeTruthy();
    }
  });

  // El `aria-labelledby` del bloque se arma con el id: repetido, dos regiones
  // apuntarían al mismo `<h2>`.
  test('los ids de los bloques son únicos', async () => {
    const ids = (await bloquesDe('admin')).map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // Un rol sin cards cae en el estado vacío: ningún rótulo huérfano.
  test('un rol desconocido no renderiza ningún bloque', async () => {
    expect(await bloquesDe('cualquier-cosa')).toEqual([]);
  });
});

describe('DashboardPage — scoping que se pasa a las secciones', () => {
  /** Encuentra las props con las que la page montó una sección. */
  async function propsDe(role: string, nombre: NombreSeccion) {
    mockClerk.currentUser.mockResolvedValue({ publicMetadata: { role } });
    const arbol = await DashboardPage();
    return buscarSecciones(arbol).find((s) => s.nombre === nombre)?.props as Record<
      string,
      unknown
    >;
  }

  // Turnos: el admin ve todos, así que NO lleva profesionalId.
  test('admin no recibe profesionalId en turnos', async () => {
    expect((await propsDe('admin', 'SeccionTurnos')).profesionalId).toBeUndefined();
  });

  test('no-admin recibe su propio userId como profesionalId', async () => {
    expect((await propsDe('medico', 'SeccionTurnos')).profesionalId).toBe('user_1');
  });

  test('admin no recibe entrenadorId en presentismo', async () => {
    expect((await propsDe('admin', 'SeccionPresentismo')).entrenadorId).toBeUndefined();
  });

  test('entrenador recibe su propio userId como entrenadorId', async () => {
    expect((await propsDe('entrenador', 'SeccionPresentismo')).entrenadorId).toBe('user_1');
  });

  /**
   * Seguimientos es GLOBAL: si alguien le pasara un profesionalId "por simetría" con
   * turnos, el número de la card dejaría de coincidir con el listado, que muestra
   * todos.
   */
  test('seguimientos no recibe ningún id de scoping, para ningún rol', async () => {
    for (const rol of ['admin', 'medico', 'social', 'entrenador']) {
      const props = await propsDe(rol, 'SeccionSeguimientos');
      expect(props).not.toHaveProperty('profesionalId');
      expect(props).not.toHaveProperty('entrenadorId');
    }
  });

  // El lugar del responsable sale de Clerk; el admin ve todos los lugares.
  test('el responsable de viandas recibe su lugar de publicMetadata', async () => {
    mockClerk.currentUser.mockResolvedValue({
      publicMetadata: { role: 'responsable_viandas', lugarRetiro: 'SEDE' },
    });
    const arbol = await DashboardPage();
    const props = buscarSecciones(arbol)[0].props as Record<string, unknown>;

    expect(props.lugar).toBe('SEDE');
    expect(props.isAdmin).toBe(false);
  });

  test('un lugarRetiro inválido en el metadata se descarta', async () => {
    mockClerk.currentUser.mockResolvedValue({
      publicMetadata: { role: 'responsable_viandas', lugarRetiro: 'MARTE' },
    });
    const arbol = await DashboardPage();
    const props = buscarSecciones(arbol)[0].props as Record<string, unknown>;

    expect(props.lugar).toBeNull();
  });
});
