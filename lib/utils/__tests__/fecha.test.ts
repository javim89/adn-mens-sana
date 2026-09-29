import { describe, it, expect, afterAll } from 'vitest';
import {
  TZ_CLUB,
  hoyEnArgentina,
  esClaveFechaValida,
  resolverFechaActiva,
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

// Valida el `?fecha=` que llega por la URL del histórico de viandas. El caso que
// justifica el helper es el día inexistente: con solo la regex, '2026-02-31'
// pasaría y se terminaría leyendo el 3 de marzo — un día que nadie pidió.
describe('esClaveFechaValida', () => {
  it('rechaza un día que no existe aunque el formato sea correcto', () => {
    expect(esClaveFechaValida('2026-02-31')).toBe(false);
  });

  it('acepta el 29 de febrero de un año bisiesto', () => {
    expect(esClaveFechaValida('2024-02-29')).toBe(true);
  });

  it('rechaza el 29 de febrero de un año que no es bisiesto', () => {
    expect(esClaveFechaValida('2026-02-29')).toBe(false);
  });

  it('acepta una clave normal', () => {
    expect(esClaveFechaValida('2026-03-14')).toBe(true);
  });

  it.each(['2026-13-01', '2026-00-10', '2026-3-4', '14/03/2026', '2026-03-14T00:00:00Z', ''])(
    'rechaza "%s"',
    (valor) => {
      expect(esClaveFechaValida(valor)).toBe(false);
    },
  );

  // El llamador recibe `string | string[] | undefined` de searchParams, así que el
  // helper tiene que aguantar cualquier cosa sin tirar.
  it.each([undefined, null, 20260314, {}, ['2026-03-14']])('rechaza el no-string %o', (valor) => {
    expect(esClaveFechaValida(valor)).toBe(false);
  });
});

/**
 * Las tres reglas del histórico de viandas. Están acá, en una función pura, y no
 * inline en el RSC, justamente para poder probarlas sin una sesión de Clerk: el
 * E2E que tocaría este camino está skippeado por falta de `storageState`.
 */
describe('resolverFechaActiva', () => {
  const HOY = '2026-03-14';
  const AYER = '2026-03-13';

  // LA regla de seguridad: el histórico es admin-only. Un responsable_viandas que
  // arma la URL a mano ve hoy, aunque el param sea impecable.
  it('ignora el param si el usuario no es admin', () => {
    expect(resolverFechaActiva(false, AYER, HOY)).toBe(HOY);
  });

  it('el admin sí puede mirar un día pasado', () => {
    expect(resolverFechaActiva(true, AYER, HOY)).toBe(AYER);
  });

  it('una fecha futura degrada a hoy', () => {
    expect(resolverFechaActiva(true, '2099-01-01', HOY)).toBe(HOY);
  });

  it('el propio día de hoy devuelve hoy', () => {
    expect(resolverFechaActiva(true, HOY, HOY)).toBe(HOY);
  });

  // Degrada en vez de tirar: así `fechaDbDesdeClave`, que TIRA, nunca ve un
  // string sin validar, y una URL basura no se convierte en una pantalla de error.
  it.each([
    ['un día inexistente', '2026-02-31'],
    ['texto cualquiera', 'no-es-una-fecha'],
    ['otro formato', '14/03/2026'],
    ['string vacío', ''],
  ])('%s degrada a hoy', (_caso, param) => {
    expect(resolverFechaActiva(true, param, HOY)).toBe(HOY);
  });

  // `searchParams` entrega `string | string[] | undefined`, así que el param llega
  // como `unknown` y un array repetido (`?fecha=a&fecha=b`) no puede colarse.
  it.each([undefined, null, ['2026-03-13'], 20260313, {}])(
    'el no-string %o degrada a hoy',
    (param) => {
      expect(resolverFechaActiva(true, param, HOY)).toBe(HOY);
    },
  );
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

  // Antes pasaba la regex y devolvía el 3 de marzo en silencio.
  it('rechaza un día inexistente en vez de corregirlo al mes siguiente', () => {
    expect(() => fechaDbDesdeClave('2026-02-31')).toThrow(/YYYY-MM-DD/);
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
