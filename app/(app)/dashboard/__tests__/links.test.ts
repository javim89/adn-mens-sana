import { describe, test, expect } from 'vitest';
import { linkTriage, linkEstado, linkPrioridad, SIN_CALCULAR } from '../_lib/links';

/**
 * Los query strings exactos, porque de ellos depende LA propiedad que hace confiable
 * al dashboard: el número de la card tiene que coincidir con el listado que abre. Un
 * param de más o de menos y la card miente.
 *
 * Se decodifica el href porque `URLSearchParams` escapa los corchetes de
 * `filter[...]`, que es correcto y además es lo que el navegador manda.
 */
function params(href: string): URLSearchParams {
  return new URLSearchParams(href.slice(href.indexOf('?') + 1));
}

describe('linkTriage', () => {
  test('apunta a /deportistas', () => {
    expect(linkTriage('ROJO').startsWith('/deportistas?')).toBe(true);
  });

  /**
   * `filter[estado]=ACTIVO` NO es decorativo: `getDeportistas` con
   * `filter[nivelTriage]` no filtra por estado, así que sin él el listado contaría
   * INACTIVO y SUSPENDIDO y el total no coincidiría con la card — que justamente se
   * rotula "Deportistas ACTIVOS en rojo".
   */
  test('lleva el nivel y el estado ACTIVO, que es lo que la query contó', () => {
    const p = params(linkTriage('ROJO'));

    expect(p.get('filter[nivelTriage]')).toBe('ROJO');
    expect(p.get('filter[estado]')).toBe('ACTIVO');
  });

  test('arranca en la página 1 con el pageSize por defecto del listado', () => {
    const p = params(linkTriage('ROJO'));

    expect(p.get('page[number]')).toBe('1');
    expect(p.get('page[size]')).toBe('20');
  });

  test.each(['VERDE', 'AMARILLO', 'NARANJA', 'ROJO'] as const)(
    'el nivel %s viaja tal cual lo espera la API',
    (nivel) => {
      expect(params(linkTriage(nivel)).get('filter[nivelTriage]')).toBe(nivel);
    },
  );

  // El bucket de los deportistas sin snapshot. La API lo acepta como un nivel más.
  test('SIN_CALCULAR es un valor válido del filtro', () => {
    expect(params(linkTriage(SIN_CALCULAR)).get('filter[nivelTriage]')).toBe('SIN_CALCULAR');
  });

  test('los corchetes van escapados, como los manda el navegador', () => {
    expect(linkTriage('ROJO')).toContain('filter%5BnivelTriage%5D=ROJO');
  });
});

describe('linkEstado', () => {
  test.each(['ACTIVO', 'LESIONADO', 'SUSPENDIDO', 'INACTIVO'] as const)(
    'filtra por el estado %s',
    (estado) => {
      const p = params(linkEstado(estado));
      expect(p.get('filter[estado]')).toBe(estado);
      // La card de plantel NO filtra por triage: cada estado es el conteo completo.
      expect(p.get('filter[nivelTriage]')).toBeNull();
    },
  );

  test('arranca en la página 1', () => {
    expect(params(linkEstado('ACTIVO')).get('page[number]')).toBe('1');
  });
});

describe('linkPrioridad', () => {
  /**
   * `/seguimientos` usa `?prioridad=` (un solo valor), no la convención
   * `filter[...]` de `/deportistas`. De ahí que ALTA y URGENTE se muestren como dos
   * números separados: una suma no tendría a dónde linkear.
   */
  test.each(['ALTA', 'URGENTE'] as const)('usa ?prioridad=%s, sin corchetes', (prioridad) => {
    expect(linkPrioridad(prioridad)).toBe(`/seguimientos?prioridad=${prioridad}`);
  });
});
