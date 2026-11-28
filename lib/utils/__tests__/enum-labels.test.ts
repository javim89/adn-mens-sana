import { describe, test, expect } from 'vitest';
import { ESTADO_EVENTO_BADGE, ESTADO_EVENTO_LABELS } from '../enum-labels';

describe('ESTADO_EVENTO_BADGE', () => {
  test('tiene un color por cada estado del evento', () => {
    expect(Object.keys(ESTADO_EVENTO_BADGE).sort()).toEqual(Object.keys(ESTADO_EVENTO_LABELS).sort());
  });

  test('programado usa el token secundario del club, no un color fijo', () => {
    expect(ESTADO_EVENTO_BADGE.PROGRAMADO).toBe('bg-secundario text-secundario-foreground');
  });
});
