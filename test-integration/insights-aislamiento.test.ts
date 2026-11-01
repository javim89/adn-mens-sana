// @vitest-environment node
/**
 * Aislamiento de Insights entre clubes, contra una base real (el branch de Neon).
 *
 * Se saltea sin `DATABASE_URL_TEST` (owner). Con `DATABASE_URL_READONLY_TEST`
 * (rol insights_ro con las RLS de `scripts/setup-insights-rls.mjs`) prueba
 * además la segunda capa: SQL que salta el prelude con `public.<tabla>`.
 *
 *   DATABASE_URL_TEST=… DATABASE_URL_READONLY_TEST=… npm run test:integration
 */
import { describe, it, expect, beforeAll } from 'vitest';

const OWNER = process.env.DATABASE_URL_TEST;
const READONLY = process.env.DATABASE_URL_READONLY_TEST;

type Run = typeof import('@/lib/insights/run');
type Club = { id: string; deportistas: number };

describe.skipIf(!OWNER)('Insights: aislamiento entre clubes (integración)', () => {
  let run: Run;
  let grande: Club;
  let chico: Club;

  beforeAll(async () => {
    process.env.DATABASE_URL = OWNER;
    if (READONLY) process.env.DATABASE_URL_READONLY = READONLY;
    else delete process.env.DATABASE_URL_READONLY;

    run = await import('@/lib/insights/run');
    const { prisma } = await import('@/lib/db');
    const clubes = await prisma.club.findMany({
      select: { id: true, _count: { select: { deportistas: true } } },
    });
    const ordenados = clubes
      .map((c) => ({ id: c.id, deportistas: c._count.deportistas }))
      .sort((a, b) => b.deportistas - a.deportistas);
    if (ordenados.length < 2) throw new Error('Hacen falta dos clubes en la base de integración');
    grande = ordenados[0];
    chico = ordenados[ordenados.length - 1];
  });

  const cantidad = { mode: 'builder' as const, dataset: 'deportistas', dimensions: [], measures: ['cantidad'] };

  it('el builder cuenta solo los deportistas del club', async () => {
    const a = await run.runQuery(cantidad, grande.id);
    const b = await run.runQuery(cantidad, chico.id);
    expect(a.rows[0].cantidad).toBe(grande.deportistas);
    expect(b.rows[0].cantidad).toBe(chico.deportistas);
  });

  it('el SQL crudo con nombres sin esquema ve solo el club (prelude)', async () => {
    const r = await run.runRawSql(`SELECT count(*) AS n FROM deportistas WHERE club_id <> '${chico.id}'`, chico.id);
    expect(r.rows[0].n).toBe(0);
  });

  it('un WITH propio del usuario también queda acotado', async () => {
    const r = await run.runRawSql('WITH d AS (SELECT * FROM deportistas) SELECT count(*) AS n FROM d', chico.id);
    expect(r.rows[0].n).toBe(chico.deportistas);
  });

  it('todos los widgets de los dashboards de sistema corren con el prelude, en los dos clubes', async () => {
    const { DASHBOARDS_SISTEMA } = await import('@/lib/insights/dashboards-sistema');
    const { querySpecSchema } = await import('@/lib/insights/schemas');
    for (const dashboard of DASHBOARDS_SISTEMA) {
      for (const widget of dashboard.widgets) {
        const spec = querySpecSchema.parse(widget.querySpec);
        for (const club of [grande, chico]) {
          await expect(run.runQuery(spec, club.id), `${dashboard.slug} · ${widget.titulo}`).resolves.toBeDefined();
        }
      }
    }
  }, 120_000);

  describe.skipIf(!READONLY)('con insights_ro (RLS)', () => {
    it('public.deportistas no filtra filas de otro club', async () => {
      const r = await run.runRawSql(
        `SELECT count(*) AS n FROM public.deportistas WHERE club_id <> '${chico.id}'`,
        chico.id,
      );
      expect(r.rows[0].n).toBe(0);
    });

    it('set_config con el id del otro club no cambia de club', async () => {
      const r = await run.runRawSql(
        `SELECT count(*) AS n FROM public.deportistas, (SELECT set_config('app.insights_token', '${grande.id}', true)) s`,
        chico.id,
      );
      expect(r.rows[0].n).toBe(0);
    });

    it('query_to_xml corre con las mismas RLS', async () => {
      const r = await run.runRawSql(
        `SELECT query_to_xml('SELECT count(*) AS n FROM public.deportistas', false, false, '')::text AS x`,
        chico.id,
      );
      expect(String(r.rows[0].x)).toContain(`<n>${chico.deportistas}</n>`);
    });
  });
});
