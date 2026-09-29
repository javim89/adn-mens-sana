import { describe, it, expect, afterAll } from 'vitest';
import {
  TZ_CLUB,
  hoyEnArgentina,
  fechaDbDesdeClave,
  horaEnArgentina,
  formatearClaveFecha,
} from '../fecha';

// El caso que justifica este archivo: la cena se entrega entre las 20 y las 22
// ART, que en UTC ya es el día siguiente. Un `toISOString().slice(0, 10)` la
// registraría con la fecha de mañana y el reporte de faltantes quedaría corrido.
describe('hoyEnArgentina', () => {
  it('a las 23:30 ART devuelve el día local, no el del UTC ya avanzado', () => {
    // 2026-03-15T02:30:00Z == 2026-03-14 23:30 en Argentina (UTC-3).
    expect(hoyEnArgentina(new Date('2026-03-15T02:30:00Z'))).toBe('2026-03-14');
  });

  it('cruza al día siguiente recién a las 03:00 UTC (medianoche ART)', () => {
    expect(hoyEnArgentina(new Date('2026-03-15T03:00:00Z'))).toBe('2026-03-15');
  });

  it('mantiene el día con UTC al borde de su propia medianoche', () => {
    expect(hoyEnArgentina(new Date('2026-03-15T23:59:00Z'))).toBe('2026-03-15');
  });

  it('usa el reloj del sistema cuando no se le pasa fecha', () => {
    expect(hoyEnArgentina()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// Regresión: el servidor de producción corre en UTC y la máquina de desarrollo en
// ART. El resultado tiene que ser el mismo en las dos, porque la zona se pasa
// explícita (TZ_CLUB) y no se hereda del proceso.
describe('hoyEnArgentina no depende de la TZ del proceso', () => {
  const originalTZ = process.env.TZ;
  afterAll(() => {
    process.env.TZ = originalTZ;
  });

  const cena = new Date('2026-03-15T02:30:00Z');

  it.each(['UTC', TZ_CLUB])('con process.env.TZ = %s devuelve 2026-03-14', (tz) => {
    process.env.TZ = tz;
    expect(hoyEnArgentina(cena)).toBe('2026-03-14');
  });
});

describe('fechaDbDesdeClave', () => {
  it('devuelve medianoche UTC, que es lo que Prisma guarda en @db.Date', () => {
    expect(fechaDbDesdeClave('2026-03-14').toISOString()).toBe('2026-03-14T00:00:00.000Z');
  });

  it('hace round-trip con hoyEnArgentina sin corrimiento', () => {
    const cena = new Date('2026-03-15T02:30:00Z');
    const fecha = fechaDbDesdeClave(hoyEnArgentina(cena));
    expect(fecha.toISOString()).toBe('2026-03-14T00:00:00.000Z');
    expect(fecha.toISOString().endsWith('T00:00:00.000Z')).toBe(true);
  });

  it('rechaza una clave con formato inválido', () => {
    expect(() => fechaDbDesdeClave('14/03/2026')).toThrow(/YYYY-MM-DD/);
  });
});

describe('horaEnArgentina', () => {
  it('convierte el instante UTC a la hora local del club', () => {
    expect(horaEnArgentina(new Date('2026-03-15T02:30:00Z'))).toBe('23:30');
  });

  it('usa 00 y no 24 a medianoche ART', () => {
    expect(horaEnArgentina(new Date('2026-03-15T03:00:00Z'))).toBe('00:00');
  });

  it('formatea el mediodía con dos dígitos', () => {
    expect(horaEnArgentina(new Date('2026-03-15T15:05:00Z'))).toBe('12:05');
  });
});

describe('formatearClaveFecha', () => {
  it('pasa de clave ISO a dd/mm/yyyy', () => {
    expect(formatearClaveFecha('2026-03-15')).toBe('15/03/2026');
  });

  it('conserva los ceros a la izquierda', () => {
    expect(formatearClaveFecha('2026-01-05')).toBe('05/01/2026');
  });
});
