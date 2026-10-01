import { describe, test, expect } from 'vitest';
import { ACENTOS, type Acento, type ModuloDashboard } from '../_lib/acentos';

const MODULOS: ModuloDashboard[] = [
  'triage',
  'viandas',
  'turnos',
  'presentismo',
  'seguimientos',
  'plantel',
  'eventos',
];

const CLAVES: (keyof Acento)[] = [
  'cuadrado',
  'bordeSuperior',
  'barraFuerte',
  'barraSuave',
  'tileFecha',
  'link',
];

describe('ACENTOS', () => {
  test('cubre exactamente los 7 módulos', () => {
    expect(Object.keys(ACENTOS).sort()).toEqual([...MODULOS].sort());
  });

  test.each(MODULOS)('%s tiene todas las claves con clases no vacías', (modulo) => {
    for (const clave of CLAVES) {
      expect(ACENTOS[modulo][clave].trim(), `${modulo}.${clave}`).not.toBe('');
    }
  });

  // Tailwind v4 solo genera clases que aparecen enteras en el fuente.
  test.each(MODULOS)('%s no usa interpolación de clases', (modulo) => {
    for (const clave of CLAVES) {
      expect(ACENTOS[modulo][clave]).not.toMatch(/\$\{|undefined/);
    }
  });

  test.each(MODULOS)('%s: el borde superior es grueso (border-t-4)', (modulo) => {
    expect(ACENTOS[modulo].bordeSuperior).toContain('border-t-4');
  });
});
