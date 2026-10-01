import { describe, it, expect, afterAll } from 'vitest';
import {
  TZ_CLUB,
  hoyEnArgentina,
  esClaveFechaValida,
  resolverFechaActiva,
  fechaDbDesdeClave,
  horaEnArgentina,
  formatearClaveFecha,
  sumarDiasClave,
  diaSemanaIso,
  semanaDeClave,
  semanaActual,
  semanaAnterior,
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

describe('sumarDiasClave', () => {
  it('suma días dentro del mismo mes', () => {
    expect(sumarDiasClave('2026-03-09', 6)).toBe('2026-03-15');
  });

  it('resta días cruzando al mes anterior', () => {
    expect(sumarDiasClave('2026-03-02', -7)).toBe('2026-02-23');
  });

  it('cruza el fin de año', () => {
    expect(sumarDiasClave('2025-12-29', 7)).toBe('2026-01-05');
  });

  it('atraviesa el 29 de febrero de un bisiesto', () => {
    expect(sumarDiasClave('2024-02-28', 2)).toBe('2024-03-01');
  });

  it('sumar cero es la identidad', () => {
    expect(sumarDiasClave('2026-03-15', 0)).toBe('2026-03-15');
  });

  it('rechaza una clave inválida en vez de devolver basura', () => {
    expect(() => sumarDiasClave('2026-02-31', 1)).toThrow(/YYYY-MM-DD/);
  });
});

// ISO: lunes = 1 … domingo = 7. `getUTCDay()` devuelve 0 para el domingo, y ese
// remapeo es toda la lógica del helper: si se olvida, `semanaDeClave` de un
// domingo devuelve la semana SIGUIENTE.
describe('diaSemanaIso', () => {
  it.each([
    ['2026-03-09', 1, 'lunes'],
    ['2026-03-10', 2, 'martes'],
    ['2026-03-11', 3, 'miércoles'],
    ['2026-03-12', 4, 'jueves'],
    ['2026-03-13', 5, 'viernes'],
    ['2026-03-14', 6, 'sábado'],
    ['2026-03-15', 7, 'domingo'],
  ])('%s es %i (%s)', (clave, esperado) => {
    expect(diaSemanaIso(clave)).toBe(esperado);
  });
});

/**
 * La semana de REPORTE del dashboard: ISO, lunes → domingo, en la zona del club.
 * No es `weekWindow()` de `lib/triage/data.ts`, que es rolling 7 días y alimenta
 * el scoring — las dos conviven a propósito.
 */
describe('semanaDeClave', () => {
  // Semana del 9 al 15 de marzo de 2026 (lunes a domingo).
  it('desde el lunes devuelve ese mismo lunes', () => {
    const s = semanaDeClave('2026-03-09');
    expect(s.desdeClave).toBe('2026-03-09');
    expect(s.hastaClave).toBe('2026-03-15');
  });

  it('desde el miércoles ancla al lunes de la misma semana', () => {
    expect(semanaDeClave('2026-03-11').desdeClave).toBe('2026-03-09');
  });

  // El borde que rompe cualquier implementación que trate al domingo como día 0.
  it('desde el domingo ancla al lunes anterior, no al siguiente', () => {
    const s = semanaDeClave('2026-03-15');
    expect(s.desdeClave).toBe('2026-03-09');
    expect(s.hastaClave).toBe('2026-03-15');
  });

  it('el rango cubre exactamente 7 días', () => {
    const s = semanaDeClave('2026-03-11');
    expect(s.finExclusivoDb.getTime() - s.desdeDb.getTime()).toBe(7 * 86_400_000);
  });

  it('cruza el cambio de mes sin corrimiento', () => {
    const s = semanaDeClave('2026-03-01'); // domingo
    expect(s.desdeClave).toBe('2026-02-23');
    expect(s.hastaClave).toBe('2026-03-01');
  });

  it('cruza el cambio de año sin corrimiento', () => {
    const s = semanaDeClave('2026-01-01'); // jueves
    expect(s.desdeClave).toBe('2025-12-29');
    expect(s.hastaClave).toBe('2026-01-04');
  });

  /**
   * LOS DOS TIPOS DE BORDE, que son el error más probable de todo el dashboard.
   *
   * `desdeDb` es medianoche UTC y sirve para las columnas de fecha (`@db.Date` y
   * también `turnos.fecha` / `seguimientos.fecha`, que son `DateTime` pero se
   * escriben con `new Date('YYYY-MM-DD')`, o sea medianoche UTC).
   *
   * `desdeInstante` es el instante en que arranca ese lunes EN EL CLUB, y sirve
   * SOLO para timestamps reales como `triage.calculated_at`. Usar `desdeDb` ahí
   * correría el corte 3 horas y mal-clasificaría una corrida del cron entre las
   * 00:00 y las 03:00 ART.
   */
  describe('los dos tipos de borde', () => {
    const s = semanaDeClave('2026-03-11');

    it('desdeDb es medianoche UTC del lunes', () => {
      expect(s.desdeDb.toISOString()).toBe('2026-03-09T00:00:00.000Z');
    });

    it('finExclusivoDb es medianoche UTC del lunes siguiente', () => {
      expect(s.finExclusivoDb.toISOString()).toBe('2026-03-16T00:00:00.000Z');
    });

    it('desdeInstante son las 03:00 UTC, que es medianoche en ART', () => {
      expect(s.desdeInstante.toISOString()).toBe('2026-03-09T03:00:00.000Z');
    });

    it('finExclusivoInstante son las 03:00 UTC del lunes siguiente', () => {
      expect(s.finExclusivoInstante.toISOString()).toBe('2026-03-16T03:00:00.000Z');
    });

    it('el instante va 3 horas DESPUÉS del borde de fecha, nunca antes', () => {
      expect(s.desdeInstante.getTime() - s.desdeDb.getTime()).toBe(3 * 3_600_000);
    });

    it('el rango de instantes también cubre exactamente 7 días', () => {
      expect(s.finExclusivoInstante.getTime() - s.desdeInstante.getTime()).toBe(
        7 * 86_400_000,
      );
    });
  });
});

describe('semanaActual', () => {
  /**
   * EL CASO QUE JUSTIFICA TODO EL BLOQUE de helpers de semana.
   *
   * `2026-03-16T02:30:00Z` es **lunes** en UTC, pero en Argentina son las 23:30
   * del **domingo 15**. La semana en curso para el club es la que arranca el
   * 2026-03-09. Una implementación con `getUTCDay()` sobre el instante diría que
   * ya empezó la semana del 16 y el dashboard mostraría una semana vacía.
   */
  it('a las 23:30 ART del domingo sigue en la semana que arrancó el lunes anterior', () => {
    const s = semanaActual(new Date('2026-03-16T02:30:00Z'));
    expect(s.desdeClave).toBe('2026-03-09');
    expect(s.hastaClave).toBe('2026-03-15');
  });

  it('recién a las 03:00 UTC (medianoche ART) pasa a la semana nueva', () => {
    const s = semanaActual(new Date('2026-03-16T03:00:00Z'));
    expect(s.desdeClave).toBe('2026-03-16');
    expect(s.hastaClave).toBe('2026-03-22');
  });

  it('a mitad de semana devuelve la semana que la contiene', () => {
    expect(semanaActual(new Date('2026-03-11T15:00:00Z')).desdeClave).toBe('2026-03-09');
  });

  it('usa el reloj del sistema cuando no se le pasa fecha', () => {
    expect(diaSemanaIso(semanaActual().desdeClave)).toBe(1);
  });

  it('desdeClave siempre es un lunes, sea cual sea el día que se le pase', () => {
    for (let i = 0; i < 14; i++) {
      const clave = sumarDiasClave('2026-03-01', i);
      expect(diaSemanaIso(semanaDeClave(clave).desdeClave)).toBe(1);
    }
  });
});

describe('semanaAnterior', () => {
  it('es la semana inmediatamente previa a la actual', () => {
    const now = new Date('2026-03-11T15:00:00Z');
    expect(semanaAnterior(now).desdeClave).toBe('2026-03-02');
    expect(semanaAnterior(now).hastaClave).toBe('2026-03-08');
  });

  // El mismo borde de TZ que semanaActual: 23:30 ART del domingo 15 está en la
  // semana del 9, así que la anterior es la del 2.
  it('respeta el borde de timezone del domingo a la noche', () => {
    expect(semanaAnterior(new Date('2026-03-16T02:30:00Z')).desdeClave).toBe('2026-03-02');
  });

  /**
   * La propiedad que hace comparable el delta: las dos semanas son contiguas y no
   * se solapan. El fin exclusivo de la anterior ES el inicio de la actual, así que
   * ningún registro se cuenta dos veces ni se cae entre las dos.
   */
  it('encaja exactamente con semanaActual, sin hueco ni solape', () => {
    const now = new Date('2026-03-11T15:00:00Z');
    expect(semanaAnterior(now).finExclusivoDb.toISOString()).toBe(
      semanaActual(now).desdeDb.toISOString(),
    );
    expect(semanaAnterior(now).finExclusivoInstante.toISOString()).toBe(
      semanaActual(now).desdeInstante.toISOString(),
    );
  });

  it('cruza el cambio de año hacia atrás', () => {
    expect(semanaAnterior(new Date('2026-01-01T15:00:00Z')).desdeClave).toBe('2025-12-22');
  });
});

// Regresión: el servidor de producción corre en UTC y la máquina de desarrollo en
// ART. Los bordes de la semana tienen que ser idénticos en las dos.
describe('la semana no depende de la TZ del proceso', () => {
  const originalTZ = process.env.TZ;
  afterAll(() => {
    process.env.TZ = originalTZ;
  });

  const domingoTarde = new Date('2026-03-16T02:30:00Z');

  it.each(['UTC', TZ_CLUB, 'Asia/Tokyo'])('con process.env.TZ = %s', (tz) => {
    process.env.TZ = tz;
    const s = semanaActual(domingoTarde);
    expect(s.desdeClave).toBe('2026-03-09');
    expect(s.desdeInstante.toISOString()).toBe('2026-03-09T03:00:00.000Z');
  });
});
