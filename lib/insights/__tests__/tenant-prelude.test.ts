import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  TABLA_CLUB,
  TABLAS_EXCLUIDAS,
  TABLAS_INSIGHTS,
  tenantCtes,
  withTenantPrelude,
} from '../tenant-prelude';
import { CATALOG } from '../catalog';

const schema = readFileSync(path.join(process.cwd(), 'prisma/schema.prisma'), 'utf8');

/** Tablas del schema (`@@map`) que tienen columna `club_id`. */
function tablasDelSchema(): { tabla: string; conClub: boolean }[] {
  return [...schema.matchAll(/^model \w+ \{([\s\S]*?)^\}/gm)].flatMap(([, cuerpo]) => {
    const map = /@@map\("([^"]+)"\)/.exec(cuerpo);
    if (!map) return [];
    return [{ tabla: map[1], conClub: /@map\("club_id"\)/.test(cuerpo) }];
  });
}

describe('tenant-tablas.json', () => {
  it('clasifica todas las tablas del schema (legible o excluida)', () => {
    const clasificadas = new Set([TABLA_CLUB, ...TABLAS_EXCLUIDAS, ...TABLAS_INSIGHTS.map((t) => t.tabla)]);
    const faltan = tablasDelSchema()
      .map((t) => t.tabla)
      .filter((t) => !clasificadas.has(t));
    expect(faltan).toEqual([]);
  });

  it('las raíces tienen club_id y los hijos no', () => {
    const conClub = new Map(tablasDelSchema().map((t) => [t.tabla, t.conClub]));
    for (const t of TABLAS_INSIGHTS) {
      expect({ tabla: t.tabla, conClub: conClub.get(t.tabla) }).toEqual({ tabla: t.tabla, conClub: !t.padre });
    }
  });

  it('cada padre está clasificado antes que su hijo (orden de los CTEs)', () => {
    const vistas = new Set<string>();
    for (const t of TABLAS_INSIGHTS) {
      if (t.padre) {
        expect(vistas.has(t.padre), `${t.tabla} → ${t.padre}`).toBe(true);
        expect(t.fk).toMatch(/^[a-z_]+_id$/);
      }
      vistas.add(t.tabla);
    }
  });

  it('las tablas sensibles de multi-tenant quedan afuera', () => {
    for (const t of ['membresias', 'invitaciones', 'superadmins', 'insights_sesiones', '_prisma_migrations']) {
      expect(TABLAS_EXCLUIDAS).toContain(t);
      expect(tenantCtes()).not.toMatch(new RegExp(`\\b${t} AS`));
    }
  });
});

describe('tenantCtes', () => {
  it('acota raíces por club_id, hijos por EXISTS sobre el CTE del padre y clubes por id', () => {
    const ctes = tenantCtes();
    expect(ctes).toContain('clubes AS NOT MATERIALIZED (SELECT * FROM public.clubes WHERE id = $1)');
    expect(ctes).toContain('turnos AS NOT MATERIALIZED (SELECT * FROM public.turnos WHERE club_id = $1)');
    expect(ctes).toContain(
      'servicios_vivienda AS NOT MATERIALIZED (SELECT * FROM public.servicios_vivienda __t WHERE EXISTS (SELECT 1 FROM vivienda_familiar __p WHERE __p.id = __t.vivienda_familiar_id))',
    );
  });

  it('cubre cada tabla que nombra el catálogo', () => {
    const ctes = tenantCtes();
    const sqlDelCatalogo = Object.values(CATALOG)
      .map((d) => [d.cte ?? '', `FROM ${d.from}`, ...d.joins].join('\n'))
      .join('\n');
    const nombradas = new Set(
      [...sqlDelCatalogo.matchAll(/\b(?:FROM|JOIN)\s+([a-z_]+)/g)].map((m) => m[1]),
    );
    const derivadas = new Set(Object.values(CATALOG).flatMap((d) => [...(d.cte ?? '').matchAll(/([a-z_]+) AS \(/g)].map((m) => m[1])));
    for (const tabla of nombradas) {
      if (derivadas.has(tabla)) continue;
      expect(ctes, tabla).toContain(`${tabla} AS NOT MATERIALIZED`);
    }
  });
});

describe('withTenantPrelude', () => {
  it('antepone el WITH a un SELECT', () => {
    expect(withTenantPrelude('SELECT 1')).toBe(`WITH ${tenantCtes()}\nSELECT 1`);
  });

  it('fusiona con un WITH existente (sacando el WITH del original)', () => {
    expect(withTenantPrelude('  WITH x AS (SELECT 1) SELECT * FROM x')).toBe(
      `WITH ${tenantCtes()},\nx AS (SELECT 1) SELECT * FROM x`,
    );
  });

  it('no fusiona con WITH RECURSIVE', () => {
    expect(() => withTenantPrelude('WITH RECURSIVE x AS (SELECT 1) SELECT 1')).toThrow(/RECURSIVE/);
  });
});
