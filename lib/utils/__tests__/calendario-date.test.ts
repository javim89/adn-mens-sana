import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { utcDateKey } from '../calendario-date';

// Regresión: FullCalendar entrega la fecha de la celda como marcador en UTC
// (medianoche UTC). Con getters locales, en una zona detrás de UTC la clave se
// corría un día para atrás (p. ej. Argentina, UTC-3), por lo que los días de
// torneo/receso/etc. nunca se coloreaban. Forzamos esa TZ para reproducirlo.
describe('utcDateKey (regresión coloreo de días)', () => {
  const originalTZ = process.env.TZ;

  beforeAll(() => {
    process.env.TZ = 'America/Argentina/Buenos_Aires';
  });
  afterAll(() => {
    process.env.TZ = originalTZ;
  });

  it('devuelve la fecha UTC del marcador, no la local corrida', () => {
    // Medianoche UTC del 1 de agosto de 2026. En UTC-3, la hora local es
    // 2026-07-31 21:00 → los getters locales darían "2026-07-31".
    const marcador = new Date('2026-08-01T00:00:00.000Z');
    expect(utcDateKey(marcador)).toBe('2026-08-01');
  });

  it('mapea correctamente un sábado de torneo (07/03/2026)', () => {
    expect(utcDateKey(new Date('2026-03-07T00:00:00.000Z'))).toBe('2026-03-07');
  });

  it('mapea la fecha sin actividad (17/10/2026)', () => {
    expect(utcDateKey(new Date('2026-10-17T00:00:00.000Z'))).toBe('2026-10-17');
  });
});
