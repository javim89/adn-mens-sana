import { describe, it, expect, vi, beforeEach } from 'vitest';

const createMock = vi.fn();

vi.mock('@/lib/db', () => ({
  prisma: {
    triage: { create: (...args: unknown[]) => createMock(...args) },
  },
}));

vi.mock('@/lib/triage/data', () => ({
  getTriageInput: vi.fn(),
}));

import { getTriageInput } from '@/lib/triage/data';
import { recomputeOne } from '@/lib/triage/recompute';
import type { TriageInput } from '@/lib/types/triage';

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

    const result = await recomputeOne('dep-1');

    expect(result.nivel).toBe('AMARILLO');
    expect(result.puntajeTotal).toBe(3);

    expect(createMock).toHaveBeenCalledTimes(1);
    const arg = createMock.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(arg.data.deportistaId).toBe('dep-1');
    expect(arg.data.nivel).toBe('AMARILLO');
    expect(arg.data.puntajeTotal).toBe(3);
    expect(Array.isArray(arg.data.desglose)).toBe(true);
  });
});
