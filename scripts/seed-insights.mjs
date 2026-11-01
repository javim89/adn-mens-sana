#!/usr/bin/env node
/**
 * Seeds the system Insights dashboards ("Panorama general" y "Viandas").
 * Uses Neon's HTTP driver (avoids the TCP/IPv6 issue like apply-migration.mjs).
 *
 * ⚠️  IDEMPOTENCIA: upsert de cada dashboard por (club, "slug"); sus widgets y filtros se
 * borran y se recrean en cada corrida, así el seed puede evolucionar sin dejar
 * widgets viejos colgados. Los demás dashboards no se tocan.
 *
 * Los `query_spec` (lib/insights/dashboards-sistema.json) usan ids REALES del catálogo (`lib/insights/catalog.ts`).
 * Si se renombra un dataset/dimensión/medida allá, hay que actualizarlos en el JSON.
 *
 * Usage: node scripts/seed-insights.mjs [--club <id>]   (default: club_gimnasia_lp)
 */
import { randomUUID } from "crypto";
import { getClubId, assertClubExiste } from "./club-arg.mjs";
import dashboards from "../lib/insights/dashboards-sistema.json" with { type: "json" };

// Las definiciones viven en lib/insights/dashboards-sistema.json: las comparte
// con `crearClub` (lib/actions/superadmin.ts), que las clona en cada club nuevo.
// Ver lib/insights/dashboards-sistema.ts para el porqué de algunos widgets.
export const dashboardsSistema = dashboards;
export const widgetsPanoramaGeneral = dashboards.find((d) => d.slug === "panorama-general").widgets;
export const widgetsViandas = dashboards.find((d) => d.slug === "viandas").widgets;

// La conexión se arma dentro de main(): así el módulo puede importarse (los
// tests validan las listas de widgets contra el catálogo) sin DATABASE_URL.
async function connect() {
  const { neon } = await import("@neondatabase/serverless");
  const { config } = await import("dotenv");
  config({ path: ".env.local" });

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }
  return neon(url);
}

async function seedDashboard(sql, clubId, { slug, nombre, descripcion, orden, widgets }) {
  const [dashboard] = await sql.query(
    `INSERT INTO "insights_dashboards"
       ("id", "club_id", "slug", "nombre", "descripcion", "es_sistema", "orden", "creado_por", "updated_at")
     VALUES ($1, $2, $3, $4, $5, true, $6, 'seed', NOW())
     ON CONFLICT ("club_id", "slug") DO UPDATE
       SET "nombre" = EXCLUDED."nombre",
           "descripcion" = EXCLUDED."descripcion",
           "es_sistema" = true,
           "orden" = EXCLUDED."orden",
           "updated_at" = NOW()
     RETURNING "id"`,
    [randomUUID(), clubId, slug, nombre, descripcion, orden]
  );

  const id = dashboard.id;

  // Los targets de filtro caen por cascade junto con los widgets/filtros.
  await sql.query('DELETE FROM "insights_filters" WHERE "dashboard_id" = $1', [id]);
  await sql.query('DELETE FROM "insights_widgets" WHERE "dashboard_id" = $1', [id]);

  for (const w of widgets) {
    await sql.query(
      `INSERT INTO "insights_widgets"
         ("id", "dashboard_id", "titulo", "descripcion", "tipo", "query_spec", "viz_config",
          "x", "y", "w", "h", "updated_at")
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10, $11, NOW())`,
      [
        randomUUID(),
        id,
        w.titulo,
        w.descripcion,
        w.tipo,
        JSON.stringify(w.querySpec),
        JSON.stringify(w.vizConfig),
        w.x,
        w.y,
        w.w,
        w.h,
      ]
    );
  }

  console.log(`  ✓ dashboard "${slug}" (${id}) — ${widgets.length} widgets recreados`);
}

async function main() {
  console.log("Seeding Insights...");

  const sql = await connect();
  const clubId = getClubId();
  await assertClubExiste(sql, clubId);

  for (const dashboard of dashboards) {
    await seedDashboard(sql, clubId, dashboard);
  }

  console.log("✓ Seed completado.");
}

// Sólo ejecutar main() si se corre directo (no cuando se importa la lista).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
}
