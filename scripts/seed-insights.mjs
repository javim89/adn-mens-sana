#!/usr/bin/env node
/**
 * Seeds the default Insights dashboard ("Panorama general").
 * Uses Neon's HTTP driver (avoids the TCP/IPv6 issue like apply-migration.mjs).
 *
 * ⚠️  IDEMPOTENCIA: upsert del dashboard por "slug"; sus widgets y filtros se
 * borran y se recrean en cada corrida, así el seed puede evolucionar sin dejar
 * widgets viejos colgados. Los demás dashboards no se tocan.
 *
 * Los `query_spec` de abajo usan ids REALES del catálogo (`lib/insights/catalog.ts`).
 * Si se renombra un dataset/dimensión/medida allá, hay que actualizarlos acá.
 *
 * Usage: node scripts/seed-insights.mjs
 */
import { randomUUID } from "crypto";

const SLUG = "panorama-general";
const NOMBRE = "Panorama general";
const DESCRIPCION =
  "Vista general del club: plantel, riesgo, presentismo y seguimientos profesionales.";

// Grilla de 12 columnas, rowHeight 40px. Los 4 KPIs arriba, luego los charts.
export const widgetsPanoramaGeneral = [
  {
    titulo: "Deportistas activos",
    descripcion: "Deportistas con estado Activo.",
    tipo: "kpi",
    querySpec: {
      mode: "builder",
      dataset: "deportistas",
      dimensions: [],
      measures: ["cantidad"],
      filters: {
        op: "all",
        children: [{ field: "estado", operator: "eq", value: "ACTIVO" }],
      },
    },
    vizConfig: { type: "kpi" },
    x: 0,
    y: 0,
    w: 3,
    h: 4,
  },
  {
    titulo: "Deportistas en riesgo alto",
    descripcion: "Triage vigente en Naranja o Rojo.",
    tipo: "kpi",
    querySpec: {
      mode: "builder",
      dataset: "triage_ultimo",
      dimensions: [],
      measures: ["deportistas"],
      filters: {
        op: "all",
        children: [
          { field: "nivel", operator: "in", value: ["NARANJA", "ROJO"] },
        ],
      },
    },
    vizConfig: { type: "kpi" },
    x: 3,
    y: 0,
    w: 3,
    h: 4,
  },
  {
    titulo: "% de presentismo (30 días)",
    descripcion: "Presentes sobre registros de asistencia de los últimos 30 días.",
    tipo: "kpi",
    querySpec: {
      mode: "builder",
      dataset: "presentismo",
      dimensions: [],
      measures: ["porcentaje_presentismo"],
      filters: {
        op: "all",
        children: [{ field: "fecha", operator: "last_n_days", value: 30 }],
      },
    },
    vizConfig: { type: "kpi" },
    x: 6,
    y: 0,
    w: 3,
    h: 4,
  },
  {
    // El plan pedía un "Comparison" mes actual vs. mes anterior; el catálogo no
    // expone medidas con ventana temporal propia, así que va como KPI del mes.
    titulo: "Seguimientos del mes",
    descripcion: "Seguimientos registrados en el mes en curso.",
    tipo: "kpi",
    querySpec: {
      mode: "builder",
      dataset: "seguimientos",
      dimensions: [],
      measures: ["seguimientos"],
      filters: {
        op: "all",
        children: [{ field: "fecha", operator: "this_month" }],
      },
    },
    vizConfig: { type: "kpi" },
    x: 9,
    y: 0,
    w: 3,
    h: 4,
  },
  {
    titulo: "Distribución de triage",
    descripcion: "Deportistas por nivel de triage vigente.",
    tipo: "donut",
    querySpec: {
      mode: "builder",
      dataset: "triage_ultimo",
      dimensions: ["nivel"],
      measures: ["deportistas"],
    },
    vizConfig: { type: "donut", colorScale: "triage" },
    x: 0,
    y: 4,
    w: 4,
    h: 8,
  },
  {
    titulo: "Deportistas por disciplina",
    descripcion: "Plantel total por disciplina, de mayor a menor.",
    tipo: "bar",
    querySpec: {
      mode: "builder",
      dataset: "deportistas",
      dimensions: ["disciplina"],
      measures: ["cantidad"],
      sort: [{ field: "cantidad", direction: "desc" }],
    },
    vizConfig: { type: "bar" },
    x: 4,
    y: 4,
    w: 8,
    h: 8,
  },
  {
    titulo: "Deportistas por categoría y estado",
    descripcion: "Composición de cada categoría según el estado del deportista.",
    tipo: "stacked_bar",
    querySpec: {
      mode: "builder",
      dataset: "deportistas",
      dimensions: ["categoria", "estado"],
      measures: ["cantidad"],
      sort: [{ field: "categoria", direction: "asc" }],
    },
    vizConfig: { type: "stacked_bar", colorScale: "estado_deportista" },
    x: 0,
    y: 12,
    w: 6,
    h: 8,
  },
  {
    titulo: "Seguimientos por mes",
    descripcion: "Evolución mensual de los seguimientos del último año.",
    tipo: "line",
    querySpec: {
      mode: "builder",
      dataset: "seguimientos",
      dimensions: ["fecha"],
      measures: ["seguimientos"],
      timeGrain: "month",
      timeDimension: "fecha",
      filters: {
        op: "all",
        children: [{ field: "fecha", operator: "last_n_days", value: 365 }],
      },
      sort: [{ field: "fecha", direction: "asc" }],
    },
    vizConfig: { type: "line" },
    x: 6,
    y: 12,
    w: 6,
    h: 8,
  },
  {
    titulo: "Seguimientos por tipo",
    descripcion: "Peso de cada área profesional sobre el total de seguimientos.",
    tipo: "pie",
    querySpec: {
      mode: "builder",
      dataset: "seguimientos",
      dimensions: ["tipo_seguimiento"],
      measures: ["seguimientos"],
      sort: [{ field: "seguimientos", direction: "desc" }],
    },
    vizConfig: { type: "pie" },
    x: 0,
    y: 20,
    w: 4,
    h: 8,
  },
  {
    titulo: "Presentismo por categoría",
    descripcion: "Porcentaje de asistencia de cada categoría.",
    tipo: "bar",
    querySpec: {
      mode: "builder",
      dataset: "presentismo",
      dimensions: ["categoria"],
      measures: ["porcentaje_presentismo"],
      sort: [{ field: "porcentaje_presentismo", direction: "desc" }],
    },
    vizConfig: { type: "bar" },
    x: 4,
    y: 20,
    w: 4,
    h: 8,
  },
  {
    titulo: "Distribución etaria",
    descripcion: "Deportistas por rango de edad.",
    tipo: "bar",
    querySpec: {
      mode: "builder",
      dataset: "deportistas",
      dimensions: ["rango_etario"],
      measures: ["cantidad"],
      sort: [{ field: "rango_etario", direction: "asc" }],
    },
    vizConfig: { type: "bar" },
    x: 8,
    y: 20,
    w: 4,
    h: 8,
  },
  {
    titulo: "Deportistas con más ausencias (90 días)",
    descripcion: "Top 15 por cantidad de ausencias en los últimos 90 días.",
    tipo: "table",
    querySpec: {
      mode: "builder",
      dataset: "presentismo",
      dimensions: ["deportista", "disciplina", "categoria"],
      measures: ["ausentes", "registros", "porcentaje_presentismo"],
      filters: {
        op: "all",
        children: [{ field: "fecha", operator: "last_n_days", value: 90 }],
      },
      sort: [{ field: "ausentes", direction: "desc" }],
      limit: 15,
    },
    vizConfig: { type: "table" },
    x: 0,
    y: 28,
    w: 12,
    h: 10,
  },
];

// La conexión se arma dentro de main(): así el módulo puede importarse (los
// tests validan `widgetsPanoramaGeneral` contra el catálogo) sin DATABASE_URL.
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

async function main() {
  console.log('Seeding Insights: dashboard "Panorama general"...');

  const sql = await connect();
  const dashboardId = randomUUID();
  const [dashboard] = await sql.query(
    `INSERT INTO "insights_dashboards"
       ("id", "slug", "nombre", "descripcion", "es_sistema", "orden", "creado_por", "updated_at")
     VALUES ($1, $2, $3, $4, true, 0, 'seed', NOW())
     ON CONFLICT ("slug") DO UPDATE
       SET "nombre" = EXCLUDED."nombre",
           "descripcion" = EXCLUDED."descripcion",
           "es_sistema" = true,
           "updated_at" = NOW()
     RETURNING "id"`,
    [dashboardId, SLUG, NOMBRE, DESCRIPCION]
  );

  const id = dashboard.id;

  // Los targets de filtro caen por cascade junto con los widgets/filtros.
  await sql.query('DELETE FROM "insights_filters" WHERE "dashboard_id" = $1', [id]);
  await sql.query('DELETE FROM "insights_widgets" WHERE "dashboard_id" = $1', [id]);

  for (const w of widgetsPanoramaGeneral) {
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

  console.log(`  ✓ dashboard "${SLUG}" (${id})`);
  console.log(`  ✓ ${widgetsPanoramaGeneral.length} widgets recreados`);
  console.log("✓ Seed completado.");
}

// Sólo ejecutar main() si se corre directo (no cuando se importa la lista).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
}
