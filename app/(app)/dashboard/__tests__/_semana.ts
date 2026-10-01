import type { RangoSemana } from '@/lib/utils/fecha';

/** La semana del lunes 28/9 al domingo 4/10 de 2026, para los tests de secciones. */
export const SEMANA: RangoSemana = {
  desdeClave: '2026-09-28',
  hastaClave: '2026-10-04',
  desdeDb: new Date('2026-09-28T00:00:00.000Z'),
  finExclusivoDb: new Date('2026-10-05T00:00:00.000Z'),
  desdeInstante: new Date('2026-09-28T03:00:00.000Z'),
  finExclusivoInstante: new Date('2026-10-05T03:00:00.000Z'),
};
