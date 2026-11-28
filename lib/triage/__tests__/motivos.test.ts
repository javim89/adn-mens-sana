import { describe, test, expect } from 'vitest';
import { motivosPrincipales, parseDesglose } from '../motivos';
import { computeTriage } from '../rules';
import type { TriageInput } from '@/lib/types/triage';

describe('motivosPrincipales', () => {
  test('las 2 reglas con más puntos, de mayor a menor', () => {
    const desglose = [
      { area: 'MEDICA', regla: 'Sin obra social', puntos: 1 },
      { area: 'PSICOLOGICA', regla: 'Evaluación psicológica URGENTE', puntos: 3 },
      { area: 'SOCIAL', regla: 'Vive en pensión', puntos: 2 },
    ];
    expect(motivosPrincipales(desglose)).toEqual([
      'Evaluación psicológica URGENTE',
      'Vive en pensión',
    ]);
  });

  test('a igual puntaje respeta el orden del desglose', () => {
    const desglose = [
      { area: 'SOCIAL', regla: 'A', puntos: 2 },
      { area: 'MEDICA', regla: 'B', puntos: 2 },
      { area: 'MEDICA', regla: 'C', puntos: 2 },
    ];
    expect(motivosPrincipales(desglose)).toEqual(['A', 'B']);
  });

  test('n configurable', () => {
    const desglose = [
      { area: 'SOCIAL', regla: 'A', puntos: 1 },
      { area: 'MEDICA', regla: 'B', puntos: 3 },
      { area: 'MEDICA', regla: 'C', puntos: 2 },
    ];
    expect(motivosPrincipales(desglose, 1)).toEqual(['B']);
    expect(motivosPrincipales(desglose, 5)).toEqual(['B', 'C', 'A']);
    expect(motivosPrincipales(desglose, 0)).toEqual([]);
  });

  test('JSON vacío, nulo o mal formado da lista vacía', () => {
    expect(motivosPrincipales([])).toEqual([]);
    expect(motivosPrincipales(null)).toEqual([]);
    expect(motivosPrincipales({ regla: 'x' })).toEqual([]);
    expect(motivosPrincipales([{ regla: 'x', puntos: '3', area: 'MEDICA' }])).toEqual([]);
  });

  test('ignora reglas sin puntos positivos', () => {
    expect(motivosPrincipales([{ area: 'MEDICA', regla: 'x', puntos: 0 }])).toEqual([]);
  });

  test('funciona con el desglose real de computeTriage', () => {
    const input: TriageInput = {
      seguimientos: [{ tipoSeguimiento: 'TRAUMATOLOGIA', prioridad: 'URGENTE' }],
      estado: 'LESIONADO',
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
      padreNacionalidad: null,
      madreNacionalidad: null,
      apoyosRequeridos: [],
      ausenciasSemana: 1,
      sinCitacionUltimas3: false,
    };
    const { desglose } = computeTriage(input);
    expect(motivosPrincipales(JSON.parse(JSON.stringify(desglose)))).toEqual([
      'Seguimiento médico URGENTE',
      'Deportista lesionado',
    ]);
  });
});

describe('parseDesglose', () => {
  test('descarta entradas con un área desconocida', () => {
    expect(
      parseDesglose([
        { area: 'MEDICA', regla: 'ok', puntos: 1 },
        { area: 'OTRA', regla: 'no', puntos: 1 },
      ]),
    ).toEqual([{ area: 'MEDICA', regla: 'ok', puntos: 1 }]);
  });
});
