import { describe, test, expect, vi, beforeEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    deportista: { findUnique: vi.fn() },
    asistencia: { groupBy: vi.fn() },
    convocatoriaDeportista: { groupBy: vi.fn() },
    eventoTorneo: { findMany: vi.fn() },
    convocatoria: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));

import { getTriageInput } from '../data';

const NOW = new Date('2026-03-14T12:00:00.000Z');

/**
 * El campo `recibeVianda` del triage dejó de existir en la base: ahora se deriva
 * de `recibeAlmuerzo || recibeCena`. Estos tests fijan esa equivalencia, porque
 * es lo que garantiza que el desdoblamiento no movió ningún puntaje de riesgo.
 */
function deportistaCon(necesidadesApoyo: unknown) {
  return {
    id: 'd1',
    estado: 'ACTIVO',
    ciudad: null,
    vivePensionClub: false,
    vivePensionExterna: false,
    disciplinaId: 'disc-1',
    categoriaId: 'cat-1',
    datosSalud: null,
    datosSociales: null,
    datosFamiliares: null,
    necesidadesApoyo,
    seguimientos: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.asistencia.groupBy.mockResolvedValue([]);
  mockPrisma.convocatoriaDeportista.groupBy.mockResolvedValue([]);
  mockPrisma.eventoTorneo.findMany.mockResolvedValue([]);
  mockPrisma.convocatoria.findMany.mockResolvedValue([]);
});

describe('derivación de recibeVianda desde los dos flags', () => {
  test('solo almuerzo cuenta como que recibe vianda', async () => {
    mockPrisma.deportista.findUnique.mockResolvedValue(
      deportistaCon({ dificultadAlimentacion: null, recibeAlmuerzo: true, recibeCena: false, apoyosRequeridos: [] }),
    );
    const input = await getTriageInput('d1', NOW);
    expect(input.recibeVianda).toBe(true);
  });

  test('solo cena cuenta como que recibe vianda', async () => {
    mockPrisma.deportista.findUnique.mockResolvedValue(
      deportistaCon({ dificultadAlimentacion: null, recibeAlmuerzo: false, recibeCena: true, apoyosRequeridos: [] }),
    );
    const input = await getTriageInput('d1', NOW);
    expect(input.recibeVianda).toBe(true);
  });

  test('ambas comidas también', async () => {
    mockPrisma.deportista.findUnique.mockResolvedValue(
      deportistaCon({ dificultadAlimentacion: null, recibeAlmuerzo: true, recibeCena: true, apoyosRequeridos: [] }),
    );
    const input = await getTriageInput('d1', NOW);
    expect(input.recibeVianda).toBe(true);
  });

  test('ninguna comida no cuenta', async () => {
    mockPrisma.deportista.findUnique.mockResolvedValue(
      deportistaCon({ dificultadAlimentacion: null, recibeAlmuerzo: false, recibeCena: false, apoyosRequeridos: [] }),
    );
    const input = await getTriageInput('d1', NOW);
    expect(input.recibeVianda).toBe(false);
  });

  test('sin satélite de necesidades de apoyo tampoco', async () => {
    mockPrisma.deportista.findUnique.mockResolvedValue(deportistaCon(null));
    const input = await getTriageInput('d1', NOW);
    expect(input.recibeVianda).toBe(false);
  });
});
