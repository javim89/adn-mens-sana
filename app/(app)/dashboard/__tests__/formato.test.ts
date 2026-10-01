import { describe, test, expect } from 'vitest';
import { diaCortoDb, diaCortoYFechaDb, diaYMesCortoDb } from '../_lib/formato';

/**
 * Las columnas de fecha llegan como medianoche UTC: leídas en la zona del club
 * caerían el día anterior. Los formateadores usan getters UTC.
 */
describe('diaCortoYFechaDb', () => {
  test('miércoles 30 de septiembre → "MIÉ 30/9"', () => {
    expect(diaCortoYFechaDb(new Date('2026-09-30T00:00:00.000Z'))).toBe('MIÉ 30/9');
  });

  test('sábado y domingo llevan tilde y abreviatura correctas', () => {
    expect(diaCortoYFechaDb(new Date('2026-10-03T00:00:00.000Z'))).toBe('SÁB 3/10');
    expect(diaCortoYFechaDb(new Date('2026-10-04T00:00:00.000Z'))).toBe('DOM 4/10');
  });

  test('medianoche UTC no se corre al día anterior', () => {
    expect(diaCortoYFechaDb(new Date('2026-01-01T00:00:00.000Z'))).toBe('JUE 1/1');
  });
});

describe('diaCortoDb / diaYMesCortoDb', () => {
  test('parten la misma fecha en día y DD/M', () => {
    const d = new Date('2026-09-30T00:00:00.000Z');
    expect(diaCortoDb(d)).toBe('MIÉ');
    expect(diaYMesCortoDb(d)).toBe('30/9');
  });
});
