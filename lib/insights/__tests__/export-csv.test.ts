import { describe, it, expect } from 'vitest';
import { csvFilename, toCsv } from '../export-csv';
import type { ColumnMeta, Row } from '../types';

const columns: ColumnMeta[] = [
  {
    id: 'estado',
    label: 'Estado',
    type: 'enum',
    role: 'dimension',
    enumLabels: { ACTIVO: 'Activo', LESIONADO: 'Lesionado' },
  },
  { id: 'nombre', label: 'Nombre', type: 'string', role: 'dimension' },
  { id: 'cantidad', label: 'Cantidad', type: 'number', role: 'measure', format: 'integer' },
];

describe('toCsv', () => {
  it('escribe el header con los labels de las columnas', () => {
    const csv = toCsv([], columns);
    expect(csv.split('\r\n')[0]).toBe('Estado;Nombre;Cantidad');
  });

  it('traduce los enums al español, como en pantalla', () => {
    const data: Row[] = [{ estado: 'LESIONADO', nombre: 'Pérez', cantidad: 3 }];
    expect(toCsv(data, columns)).toContain('Lesionado;Pérez;3');
  });

  it('escapa las comillas duplicándolas y entrecomilla el campo', () => {
    const data: Row[] = [{ estado: 'ACTIVO', nombre: 'El "Lobo" Gómez', cantidad: 1 }];
    expect(toCsv(data, columns)).toContain('"El ""Lobo"" Gómez"');
  });

  it('entrecomilla los campos que traen el separador', () => {
    const data: Row[] = [{ estado: 'ACTIVO', nombre: 'Gómez; Juan', cantidad: 1 }];
    expect(toCsv(data, columns)).toContain('"Gómez; Juan"');
  });

  it('entrecomilla los campos con salto de línea', () => {
    const data: Row[] = [{ estado: 'ACTIVO', nombre: 'línea1\nlínea2', cantidad: 1 }];
    expect(toCsv(data, columns)).toContain('"línea1\nlínea2"');
  });

  it('usa ";" como separador para no chocar con el decimal es-AR', () => {
    const cols: ColumnMeta[] = [
      { id: 'imc', label: 'IMC', type: 'number', role: 'measure', format: 'decimal' },
      { id: 'peso', label: 'Peso', type: 'number', role: 'measure', format: 'decimal' },
    ];
    const csv = toCsv([{ imc: 22.85, peso: 70.5 }], cols);
    const fila = csv.split('\r\n')[1];

    // El decimal con coma tiene que quedar intacto y separado por ";".
    expect(fila).toBe('22,85;70,5');
    expect(fila.split(';')).toHaveLength(2);
  });

  it('muestra los vacíos como "Sin dato" y no como celda en blanco', () => {
    const data: Row[] = [{ estado: null, nombre: '', cantidad: 0 }];
    const fila = toCsv(data, columns).split('\r\n')[1];
    expect(fila).toBe('Sin dato;Sin dato;0');
  });

  it('traduce los booleanos', () => {
    const cols: ColumnMeta[] = [
      { id: 'socio', label: 'Es socio', type: 'boolean', role: 'dimension' },
    ];
    expect(toCsv([{ socio: true }, { socio: false }], cols)).toContain('Sí');
    expect(toCsv([{ socio: false }], cols)).toContain('No');
  });

  it('formatea las fechas en es-AR', () => {
    const cols: ColumnMeta[] = [
      { id: 'fecha', label: 'Fecha', type: 'date', role: 'dimension' },
    ];
    const csv = toCsv([{ fecha: '2026-03-08T00:00:00.000Z' }], cols);
    expect(csv).toMatch(/08\/03\/2026/);
  });

  it('separa las filas con CRLF", que es lo que espera Excel', () => {
    const data: Row[] = [
      { estado: 'ACTIVO', nombre: 'A', cantidad: 1 },
      { estado: 'ACTIVO', nombre: 'B', cantidad: 2 },
    ];
    expect(toCsv(data, columns).split('\r\n')).toHaveLength(3);
  });
});

describe('csvFilename', () => {
  it('normaliza el título a un nombre de archivo seguro', () => {
    expect(csvFilename('Deportistas por disciplina')).toMatch(
      /^deportistas-por-disciplina-\d{4}-\d{2}-\d{2}\.csv$/,
    );
  });

  it('saca los acentos y los signos', () => {
    expect(csvFilename('% de presentismo (30 días)')).toMatch(/^de-presentismo-30-dias-/);
  });

  it('cae en un nombre por defecto si el título no deja nada usable', () => {
    expect(csvFilename('¿?¡!')).toMatch(/^insights-/);
  });
});
