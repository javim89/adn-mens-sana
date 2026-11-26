import { describe, expect, it, vi } from 'vitest';
import {
  LOCK_MIGRACIONES,
  aplicarMigracion,
  aplicarPendientes,
  checksum,
  detectarNoTransaccionables,
  limpiarSql,
  planificar,
} from '../migraciones.mjs';

const hecha = (migration_name: string) => ({ migration_name, finished_at: new Date(), rolled_back_at: null });

describe('planificar', () => {
  it('pendientes = archivos sin registrar, en orden', () => {
    const plan = planificar(['20260103_c', '20260101_a', '20260102_b'], [hecha('20260101_a')]);
    expect(plan.pendientes).toEqual(['20260102_b', '20260103_c']);
    expect(plan.fueraDeOrden).toEqual([]);
    expect(plan.ultimaAplicada).toBe('20260101_a');
  });

  it('sin pendientes con todo registrado', () => {
    expect(planificar(['1_a', '2_b'], [hecha('2_b'), hecha('1_a')]).pendientes).toEqual([]);
  });

  it('ordena por bytes, como Prisma', () => {
    expect(planificar(['20261101000010_x', '20261101000002_y', '20261101000001_z'], []).pendientes).toEqual([
      '20261101000001_z',
      '20261101000002_y',
      '20261101000010_x',
    ]);
  });

  it('marca fuera de orden a las pendientes anteriores a la última aplicada', () => {
    const plan = planificar(['1_a', '2_b', '3_c', '4_d'], [hecha('1_a'), hecha('3_c')]);
    expect(plan.pendientes).toEqual(['2_b', '4_d']);
    expect(plan.fueraDeOrden).toEqual(['2_b']);
  });

  it('una revertida vuelve a estar pendiente', () => {
    const plan = planificar(['1_a', '2_b'], [hecha('1_a'), { migration_name: '2_b', finished_at: new Date(), rolled_back_at: new Date() }]);
    expect(plan.pendientes).toEqual(['2_b']);
  });

  it('separa las empezadas y sin terminar', () => {
    const plan = planificar(['1_a', '2_b'], [hecha('1_a'), { migration_name: '2_b', finished_at: null, rolled_back_at: null }]);
    expect(plan.fallidas).toEqual(['2_b']);
    expect(plan.pendientes).toEqual([]);
  });

  it('avisa de registradas sin directorio', () => {
    expect(planificar(['1_a'], [hecha('1_a'), hecha('0_vieja')]).sinArchivo).toEqual(['0_vieja']);
  });
});

describe('detectarNoTransaccionables', () => {
  it('acepta DDL común y bloques $$ con BEGIN/COMMIT adentro', () => {
    const sql = `
      CREATE TABLE "t" ("id" TEXT NOT NULL);
      CREATE INDEX "t_idx" ON "t"("id");
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1) THEN RAISE NOTICE 'commit;'; END IF;
      END $$;
      CREATE FUNCTION f() RETURNS void AS $body$ BEGIN PERFORM 1; END; $body$ LANGUAGE plpgsql;`;
    expect(detectarNoTransaccionables(sql)).toEqual([]);
  });

  it.each([
    ['CREATE INDEX CONCURRENTLY "i" ON "t"("a");', 'CREATE INDEX CONCURRENTLY'],
    ['create unique index concurrently i on t(a);', 'CREATE INDEX CONCURRENTLY'],
    ['DROP INDEX CONCURRENTLY "i";', 'DROP INDEX CONCURRENTLY'],
    ['REINDEX INDEX CONCURRENTLY i;', 'REINDEX CONCURRENTLY'],
    ['VACUUM ANALYZE "t";', 'VACUUM'],
    ['CREATE DATABASE x;', 'CREATE/DROP DATABASE'],
    ['ALTER SYSTEM SET work_mem = 1;', 'ALTER SYSTEM'],
    ['ALTER TABLE p DETACH PARTITION c CONCURRENTLY;', 'DETACH PARTITION CONCURRENTLY'],
    ['BEGIN;\nCREATE TABLE t (id int);\nCOMMIT;', 'control de transacción propio'],
  ])('bloquea %s', (sql, motivo) => {
    expect(detectarNoTransaccionables(sql)).toContain(motivo);
  });

  it('ignora lo que aparece en comentarios y strings', () => {
    const sql = `-- CREATE INDEX CONCURRENTLY x
      /* VACUUM; */
      COMMENT ON TABLE "t" IS 'VACUUM; CREATE DATABASE y';
      SELECT "VACUUM" FROM t;`;
    expect(detectarNoTransaccionables(sql)).toEqual([]);
  });

  it('ADD VALUE solo no bloquea; ADD VALUE más su uso en el mismo archivo, sí', () => {
    expect(detectarNoTransaccionables(`ALTER TYPE "E" ADD VALUE IF NOT EXISTS 'NUEVO';`)).toEqual([]);
    const conUso = `ALTER TYPE "E" ADD VALUE 'NUEVO';\nUPDATE "t" SET "e" = 'NUEVO';`;
    expect(detectarNoTransaccionables(conUso)).toEqual(["ALTER TYPE … ADD VALUE 'NUEVO' y su uso en el mismo archivo"]);
  });

  it('el ADD VALUE en un comentario no cuenta como uso', () => {
    expect(detectarNoTransaccionables(`-- usa 'NUEVO'\nALTER TYPE "E" ADD VALUE 'NUEVO';`)).toEqual([]);
  });
});

describe('limpiarSql', () => {
  it('saca cuerpos dollar-quoted y respeta los escapes de strings', () => {
    expect(limpiarSql(`SELECT $x$ ; $x$, 'a''b;c', E'd\\'e;f';`)).toBe(`SELECT  $$ , '', E'';`);
  });

  it('no confunde parámetros $1 con dollar quotes', () => {
    expect(limpiarSql('SELECT $1, $2;')).toBe('SELECT $1, $2;');
  });
});

type Llamada = [string, unknown[]?];

function clienteFalso({ yaAplicada = false, fallaEn }: { yaAplicada?: boolean; fallaEn?: string } = {}) {
  const llamadas: Llamada[] = [];
  const query = vi.fn(async (texto: string, params?: unknown[]) => {
    llamadas.push(params ? [texto, params] : [texto]);
    if (fallaEn && texto.includes(fallaEn)) throw new Error('relation "x" already exists');
    if (texto.includes('SELECT 1 FROM "_prisma_migrations"')) return { rows: yaAplicada ? [{ '?column?': 1 }] : [] };
    return { rows: [] };
  });
  return { cliente: { query }, llamadas };
}

describe('aplicarMigracion', () => {
  const m = { nombre: '20260101_a', sql: 'CREATE TABLE "a" (id int);\nDO $$ BEGIN PERFORM 1; END $$;' };

  it('corre el archivo entero en una transacción y lo registra con el checksum del archivo', async () => {
    const { cliente, llamadas } = clienteFalso();
    await expect(aplicarMigracion(cliente, m)).resolves.toBe('aplicada');
    const textos = llamadas.map(([t]) => t);
    expect(textos[0]).toBe('BEGIN');
    expect(llamadas[1]).toEqual(['SELECT pg_advisory_xact_lock($1)', [LOCK_MIGRACIONES]]);
    expect(textos[3]).toBe(m.sql);
    expect(textos[4]).toContain('INSERT INTO "_prisma_migrations"');
    expect(llamadas[4][1]?.slice(0, 2)).toEqual([checksum(m.sql), m.nombre]);
    expect(textos.at(-1)).toBe('COMMIT');
  });

  it('ROLLBACK y relanza si falla el SQL; no registra', async () => {
    const { cliente, llamadas } = clienteFalso({ fallaEn: 'CREATE TABLE' });
    await expect(aplicarMigracion(cliente, m)).rejects.toThrow('already exists');
    const textos = llamadas.map(([t]) => t);
    expect(textos.at(-1)).toBe('ROLLBACK');
    expect(textos).not.toContain('COMMIT');
    expect(textos.some((t) => t.includes('INSERT'))).toBe(false);
  });

  it('ROLLBACK si falla el registro', async () => {
    const { cliente, llamadas } = clienteFalso({ fallaEn: 'INSERT INTO' });
    await expect(aplicarMigracion(cliente, m)).rejects.toThrow();
    expect(llamadas.map(([t]) => t).at(-1)).toBe('ROLLBACK');
  });

  it('no la corre si otro proceso la registró mientras tanto', async () => {
    const { cliente, llamadas } = clienteFalso({ yaAplicada: true });
    await expect(aplicarMigracion(cliente, m)).resolves.toBe('ya-aplicada');
    const textos = llamadas.map(([t]) => t);
    expect(textos).not.toContain(m.sql);
    expect(textos.at(-1)).toBe('ROLLBACK');
  });

  it('el checksum es el sha256 hex del archivo, como apply-migration.mjs', () => {
    expect(checksum('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});

describe('aplicarPendientes', () => {
  it('aplica en orden y corta en la primera que falla', async () => {
    const { cliente, llamadas } = clienteFalso({ fallaEn: 'CREATE TABLE "b"' });
    const migraciones = [
      { nombre: '1_a', sql: 'CREATE TABLE "a" (id int);' },
      { nombre: '2_b', sql: 'CREATE TABLE "b" (id int);' },
      { nombre: '3_c', sql: 'CREATE TABLE "c" (id int);' },
    ];
    const log = vi.fn();
    const error = await aplicarPendientes(cliente, migraciones, { log }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('Falló 2_b');
    expect((error as { resultado: { aplicadas: string[] } }).resultado.aplicadas).toEqual(['1_a']);
    expect(llamadas.some(([t]) => t.includes('"c"'))).toBe(false);
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/aplicada {2}1_a \(\d+ ms\)/));
  });

  it('informa lo aplicado y lo salteado', async () => {
    const { cliente } = clienteFalso();
    const r = await aplicarPendientes(cliente, [{ nombre: '1_a', sql: 'SELECT 1;' }], { log: () => {} });
    expect(r).toEqual({ aplicadas: ['1_a'], salteadas: [] });
  });
});
