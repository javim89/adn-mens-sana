import { describe, test, expect } from 'vitest';
import { fechaCorta, fechaLarga, inicialesDe } from '../_lib/formato';

describe('formato de seguimientos', () => {
  test('inicialesDe usa nombre y apellido', () => {
    expect(inicialesDe({ nombre: 'juan', apellido: 'Pérez' })).toBe('JP');
    expect(inicialesDe({ nombre: '', apellido: '' })).toBe('?');
  });

  test('fechaCorta omite el año en curso y lo abrevia si es otro', () => {
    const hoy = new Date(2026, 10, 27);
    expect(fechaCorta('2026-07-01', hoy)).toBe('1/7');
    expect(fechaCorta('2025-12-31', hoy)).toBe('31/12/25');
  });

  test('fechaLarga es dd/mm/yyyy', () => {
    expect(fechaLarga('2026-07-01')).toBe('01/07/2026');
  });
});
