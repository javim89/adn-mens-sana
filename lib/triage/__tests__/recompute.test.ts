import { describe, it, expect, vi, beforeEach } from 'vitest';

const createMock = vi.fn();

vi.mock('@/lib/triage/data', () => ({
  getTriageInput: vi.fn(),
}));

import { getTriageInput } from '@/lib/triage/data';
import { recomputeOne } from '@/lib/triage/recompute';
import type { TriageInput } from '@/lib/types/triage';
import type { DbClub } from '@/lib/tenant/db';

/** El cliente del club que recibe por parámetro (en la app, `getDb()` o `dbDelClub`). */
const db = { triage: { create: (...args: unknown[]) => createMock(...args) } } as unknown as DbClub;

function baseInput(overrides: Partial<TriageInput> = {}): TriageInput {
  return {
    seguimientos: [],
    estado: 'ACTIVO',
    historialLesiones: null,
    obraSocial: 'OSDE',
    dificultadAlimentacion: null,
    recibeVianda: false,
    vivePensionClub: false,
    vivePensionExterna: false,
    situacionLaboralHogar: null,
    trabaja: null,
    ciudad: 'La Plata',
    nacionalidad: 'Argentina',
    padreNacionalidad: 'Argentina',
    madreNacionalidad: 'Argentina',
    apoyosRequeridos: [],
    ausenciasSemana: 0,
    sinCitacionUltimas3: false,
    ...overrides,
  };
}

describe('recomputeOne', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserta un snapshot con la forma válida de Triage', async () => {
    vi.mocked(getTriageInput).mockResolvedValue(
      baseInput({ estado: 'LESIONADO', historialLesiones: 'esguince' }),
    );

    const result = await recomputeOne(db, 'dep-1');

    expect(result.nivel).toBe('AMARILLO');
    expect(result.puntajeTotal).toBe(3);

    // Escribe con el cliente recibido (y no con uno global), que es el que pone el club.
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(vi.mocked(getTriageInput).mock.calls[0][0]).toBe(db);
    const arg = createMock.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(arg.data.deportistaId).toBe('dep-1');
    expect(arg.data.nivel).toBe('AMARILLO');
    expect(arg.data.puntajeTotal).toBe(3);
    expect(Array.isArray(arg.data.desglose)).toBe(true);
  });
});
