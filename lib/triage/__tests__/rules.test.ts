import { describe, it, expect } from 'vitest';
import { computeTriage } from '@/lib/triage/rules';
import type { TriageInput, TriageSeguimientoInput } from '@/lib/types/triage';

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

const seg = (
  tipoSeguimiento: TriageSeguimientoInput['tipoSeguimiento'],
  prioridad: TriageSeguimientoInput['prioridad'],
): TriageSeguimientoInput => ({ tipoSeguimiento, prioridad });

describe('computeTriage — niveles', () => {
  it('0 puntos → VERDE', () => {
    const r = computeTriage(baseInput());
    expect(r.puntajeTotal).toBe(0);
    expect(r.nivel).toBe('VERDE');
    expect(r.desglose).toEqual([]);
  });

  it('3 puntos → AMARILLO', () => {
    // LESIONADO (+2) + historial (+1) = 3
    const r = computeTriage(baseInput({ estado: 'LESIONADO', historialLesiones: 'esguince' }));
    expect(r.puntajeTotal).toBe(3);
    expect(r.nivel).toBe('AMARILLO');
  });

  it('5 puntos → NARANJA', () => {
    // médico URGENTE (+3) + LESIONADO (+2) = 5
    const r = computeTriage(
      baseInput({
        seguimientos: [seg('TRAUMATOLOGIA', 'URGENTE')],
        estado: 'LESIONADO',
      }),
    );
    expect(r.puntajeTotal).toBe(5);
    expect(r.nivel).toBe('NARANJA');
  });

  it('6 puntos → ROJO', () => {
    // médico URGENTE (+3) + LESIONADO (+2) + historial (+1) = 6
    const r = computeTriage(
      baseInput({
        seguimientos: [seg('TRAUMATOLOGIA', 'URGENTE')],
        estado: 'LESIONADO',
        historialLesiones: 'rotura',
      }),
    );
    expect(r.puntajeTotal).toBe(6);
    expect(r.nivel).toBe('ROJO');
  });
});

describe('computeTriage — reglas representativas', () => {
  it('dos seguimientos médicos ALTA suman +2', () => {
    const r = computeTriage(
      baseInput({ seguimientos: [seg('TRAUMATOLOGIA', 'ALTA'), seg('HISTORIA_CLINICA', 'ALTA')] }),
    );
    const c = r.desglose.find((x) => x.regla.includes('ALTA'));
    expect(c?.puntos).toBe(2);
  });

  it('un solo seguimiento médico ALTA suma +1', () => {
    const r = computeTriage(baseInput({ seguimientos: [seg('TRAUMATOLOGIA', 'ALTA')] }));
    expect(r.puntajeTotal).toBe(1);
  });

  it('LESIONADO suma +2', () => {
    const r = computeTriage(baseInput({ estado: 'LESIONADO' }));
    expect(r.puntajeTotal).toBe(2);
    expect(r.desglose[0].area).toBe('MEDICA');
  });

  it('sin obra social suma +1', () => {
    const r = computeTriage(baseInput({ obraSocial: null }));
    expect(r.puntajeTotal).toBe(1);
  });

  it('recibe vianda suma +1 (educacional)', () => {
    const r = computeTriage(baseInput({ recibeVianda: true }));
    expect(r.desglose[0].area).toBe('EDUCACIONAL');
    expect(r.puntajeTotal).toBe(1);
  });

  it('vive en pensión suma +2 (social)', () => {
    const r = computeTriage(baseInput({ vivePensionClub: true }));
    expect(r.desglose[0].area).toBe('SOCIAL');
    expect(r.puntajeTotal).toBe(2);
  });

  it('dos o más ausencias en la semana suman +2 (deportiva)', () => {
    const r = computeTriage(baseInput({ ausenciasSemana: 3 }));
    expect(r.desglose[0].area).toBe('DEPORTIVA');
    expect(r.puntajeTotal).toBe(2);
  });

  it('una ausencia suma +1', () => {
    const r = computeTriage(baseInput({ ausenciasSemana: 1 }));
    expect(r.puntajeTotal).toBe(1);
  });

  it('sin citación en las últimas 3 competencias suma +2', () => {
    const r = computeTriage(baseInput({ sinCitacionUltimas3: true }));
    expect(r.puntajeTotal).toBe(2);
    expect(r.desglose[0].area).toBe('DEPORTIVA');
  });

  it('psicológica URGENTE y ALTA acumulan (+3 y +2)', () => {
    const r = computeTriage(
      baseInput({
        seguimientos: [seg('EVALUACION_PSICOLOGICA', 'URGENTE'), seg('EVALUACION_PSICOLOGICA', 'ALTA')],
      }),
    );
    const psico = r.desglose.filter((x) => x.area === 'PSICOLOGICA');
    expect(psico.reduce((a, c) => a + c.puntos, 0)).toBe(5);
  });

  it('compuesta con 3 áreas críticas suma +2', () => {
    const r = computeTriage(
      baseInput({
        seguimientos: [
          seg('TRAUMATOLOGIA', 'ALTA'),
          seg('EVALUACION_PSICOLOGICA', 'URGENTE'),
          seg('ANTROPOMETRIA', 'ALTA'),
        ],
      }),
    );
    const compuesta = r.desglose.find((x) => x.area === 'COMPUESTA');
    expect(compuesta?.puntos).toBe(2);
  });

  it('ciudad y nacionalidad se normalizan (acentos/mayúsculas no penalizan)', () => {
    const r = computeTriage(baseInput({ ciudad: 'LA PLATA', nacionalidad: 'ARGENTINA' }));
    expect(r.puntajeTotal).toBe(0);
  });

  it('ciudad distinta de La Plata suma +1', () => {
    const r = computeTriage(baseInput({ ciudad: 'Berisso' }));
    expect(r.puntajeTotal).toBe(1);
  });

  it('GENERICO y null no aportan por área', () => {
    const r = computeTriage(
      baseInput({ seguimientos: [seg('GENERICO', 'URGENTE'), seg(null, 'URGENTE')] }),
    );
    expect(r.puntajeTotal).toBe(0);
  });

  it('apoyos distintos de NINGUNO suman +1', () => {
    const r = computeTriage(baseInput({ apoyosRequeridos: ['NINGUNO', 'ECONOMICO'] }));
    expect(r.puntajeTotal).toBe(1);
  });
});
