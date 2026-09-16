import { describe, it, test, expect } from 'vitest';
import { validateRawSql } from '../sql-guard';

const aceptados: [string, string][] = [
  ['SELECT simple', 'SELECT count(*) FROM deportistas'],
  ['SELECT en minúsculas', 'select nombre from deportistas'],
  ['con salto de línea inicial', '\n  SELECT 1'],
  [
    'CTE con WITH',
    `WITH activos AS (SELECT id FROM deportistas WHERE estado = 'ACTIVO')
     SELECT count(*) FROM activos`,
  ],
  [
    'varios CTEs encadenados',
    `WITH a AS (SELECT 1 AS n), b AS (SELECT n + 1 AS n FROM a) SELECT * FROM b`,
  ],
  ['comentario de línea al final', 'SELECT 1 -- un comentario cualquiera'],
  ['comentario de bloque', 'SELECT /* nota al margen */ 1'],
  ['comentario de bloque anidado', 'SELECT /* nivel 1 /* nivel 2 */ sigue */ 1'],
  [
    'string literal que menciona una palabra de la blacklist',
    "SELECT * FROM seguimientos WHERE titulo = 'DROP de la temporada'",
  ],
  [
    'string con comilla escapada por duplicación',
    "SELECT * FROM deportistas WHERE apellido = 'O''Brien'",
  ],
  ['comentario que contiene DELETE', 'SELECT 1 -- DELETE FROM deportistas'],
  [
    'palabras de la blacklist como parte de un identificador',
    'SELECT created_at, updated_at FROM deportistas',
  ],
  ['función de agregación con FILTER', "SELECT count(*) FILTER (WHERE estado = 'PRESENTE') FROM asistencias"],
  ['subquery', 'SELECT * FROM (SELECT id FROM deportistas) q'],
  ['dollar quoting', 'SELECT $$texto con ; adentro$$ AS t'],
  ['dollar quoting con tag', 'SELECT $tag$ DROP TABLE x $tag$ AS t'],
  // Un ';' final es lo que escribe cualquiera y no encadena nada.
  ['punto y coma final', 'SELECT 1;'],
  ['punto y coma final con espacios y salto', 'SELECT 1 ;  \n'],
  ['punto y coma final tras un comentario', 'SELECT 1; -- listo'],
];

const rechazados: [string, string][] = [
  ['vacío', '   '],
  ['multi-statement', 'SELECT 1; SELECT 2'],
  // El ';' final se tolera, pero eso no debe habilitar encadenar sentencias:
  // cualquier ';' que no sea el último sigue siendo rechazo.
  ['multi-statement con punto y coma final', 'SELECT 1; SELECT 2;'],
  ['segunda sentencia inocua', 'SELECT 1; SELECT 2 ;'],
  ['statement encadenado después de un comentario', 'SELECT 1 --\nDELETE FROM deportistas'],
  ['INSERT', "INSERT INTO deportistas (nombre) VALUES ('x')"],
  ['UPDATE', "UPDATE deportistas SET estado = 'ACTIVO'"],
  ['DELETE', 'DELETE FROM deportistas'],
  ['DROP', 'DROP TABLE deportistas'],
  ['ALTER', 'ALTER TABLE deportistas ADD COLUMN x int'],
  ['CREATE', 'CREATE TABLE t (id int)'],
  ['TRUNCATE', 'TRUNCATE deportistas'],
  ['GRANT', 'GRANT ALL ON deportistas TO public'],
  ['REVOKE', 'REVOKE ALL ON deportistas FROM public'],
  ['COPY', "COPY deportistas TO '/tmp/x.csv'"],
  ['SET ROLE', 'SET ROLE postgres'],
  ['pg_read_file', "SELECT pg_read_file('/etc/passwd')"],
  ['pg_ls_dir', "SELECT pg_ls_dir('/')"],
  ['dblink', "SELECT dblink('dbname=x', 'SELECT 1')"],
  ['lo_import', "SELECT lo_import('/etc/passwd')"],
  ['lo_export', 'SELECT lo_export(1, 2)'],
  ['CTE con DML adentro', 'WITH x AS (DELETE FROM triage RETURNING id) SELECT * FROM x'],
  ['DML escondido tras un comentario de bloque', 'SELECT 1 /* nota */ ; DROP TABLE triage'],
  ['EXPLAIN (no empieza con SELECT ni WITH)', 'EXPLAIN SELECT 1'],
  ['SHOW (no empieza con SELECT ni WITH)', 'SHOW ALL'],
  ['DELETE en mayúsculas y minúsculas mezcladas', 'select 1 from (DeLeTe from triage) q'],
  ['string sin cerrar', "SELECT * FROM deportistas WHERE nombre = 'abierto"],
  ['comentario de bloque sin cerrar', 'SELECT 1 /* nunca cierra'],
];

describe('validateRawSql — aceptados', () => {
  test.each(aceptados)('%s', (_titulo, sql) => {
    expect(validateRawSql(sql)).toEqual({ ok: true });
  });
});

describe('validateRawSql — rechazados', () => {
  test.each(rechazados)('%s', (_titulo, sql) => {
    const result = validateRawSql(sql);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
  });
});

describe('validateRawSql — detalle de los mensajes', () => {
  it('avisa del punto y coma', () => {
    const result = validateRawSql('SELECT 1; SELECT 2');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/una sentencia/);
  });

  it('avisa cuándo la consulta no es de lectura', () => {
    const result = validateRawSql('EXPLAIN SELECT 1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/SELECT o WITH/);
  });

  it('nombra la palabra prohibida encontrada', () => {
    const result = validateRawSql('SELECT * FROM x WHERE 1 = 1 UNION SELECT 1 FROM pg_ls_dir(1)');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/pg_ls_dir/);
  });

  it('no acepta valores que no son texto', () => {
    expect(validateRawSql(undefined as unknown as string).ok).toBe(false);
    expect(validateRawSql(42 as unknown as string).ok).toBe(false);
  });
});
