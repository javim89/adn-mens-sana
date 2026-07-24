#!/usr/bin/env node
/**
 * Seeds the Calendario module with the LPF "Torneo Juveniles 2026" fixture.
 * Uses Neon's HTTP driver (avoids the TCP/IPv6 issue like apply-migration.mjs).
 * Idempotent: clears the 4 calendario tables and re-inserts.
 *
 * Populates: catálogo completo de 15 categorías (upsert no destructivo por
 * nombre), 36 equipos, 39 días (35 torneo + 4 especiales), and 210 eventos of
 * GIMNASIA (LP) (one row per torneo category, 6 per fecha).
 *
 * Usage: node scripts/seed-calendario.mjs
 */
import { randomUUID } from "crypto";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { catalogoCategorias } from "./seed-categorias.mjs";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}
const sql = neon(url);

const LP = "GIMNASIA (LP)";

// --- Categorías -------------------------------------------------------------
// El catálogo (15 categorías) vive en seed-categorias.mjs (fuente de verdad).
// Acá se importa y se upserta para que este seed sea autosuficiente.

// La pertenencia 4-5-6 / 7-8-9 ya no vive en la DB: se hardcodea acá para el fixture.
const grupo456 = new Set(["4ta", "5ta", "6ta"]);

// Sólo las 6 de torneo generan eventos.
const categoriasTorneo = catalogoCategorias.filter((c) => c.orden <= 6);

// --- Equipos (36) -----------------------------------------------------------
const equipoNombres = [
  "DEF. Y JUSTICIA", "GIMNASIA (LP)", "SAN LORENZO", "UNIÓN", "RIVER PLATE",
  "QUILMES", "BARRACAS CENTRAL", "ESTUDIANTES (RÍO IV)", "TALLERES", "INSTITUTO",
  "ARGENTINOS JRS.", "SAN MARTÍN (SJ)", "NEWELL'S", "INDEPENDIENTE", "LANÚS",
  "FERRO", "IND. RIVADAVIA", "ATLÉTICO TUCUMÁN", "CENTRAL CÓRDOBA", "GIMNASIA",
  "VÉLEZ SARSFIELD", "BANFIELD", "RACING CLUB", "ROSARIO CENTRAL", "GODOY CRUZ",
  "PLATENSE", "SARMIENTO", "BELGRANO", "ATLÉTICO RAFAELA", "DEP. RIESTRA",
  "ALDOSIVI", "BOCA JUNIORS", "COLÓN", "HURACÁN", "ESTUDIANTES (LP)", "TIGRE",
];

// --- Días de calendario -----------------------------------------------------
// Fechas de torneo: [numeroFecha, YYYY-MM-DD]
const fechasTorneo = [
  [1, "2026-03-07"], [2, "2026-03-14"], [3, "2026-03-21"], [4, "2026-03-28"],
  [5, "2026-04-02"], [6, "2026-04-11"], [7, "2026-04-18"], [8, "2026-04-25"],
  [9, "2026-05-02"], [10, "2026-05-09"], [11, "2026-05-16"], [12, "2026-05-23"],
  [13, "2026-05-30"], [14, "2026-06-06"], [15, "2026-06-13"], [16, "2026-06-20"],
  [17, "2026-06-27"], [18, "2026-07-04"], [19, "2026-07-11"], [20, "2026-08-01"],
  [21, "2026-08-08"], [22, "2026-08-15"], [23, "2026-08-22"], [24, "2026-08-29"],
  [25, "2026-09-05"], [26, "2026-09-12"], [27, "2026-09-19"], [28, "2026-09-26"],
  [29, "2026-10-03"], [30, "2026-10-10"], [31, "2026-10-24"], [32, "2026-10-31"],
  [33, "2026-11-07"], [34, "2026-11-14"], [35, "2026-11-28"],
];
// Fechas especiales: sin numeroFecha, sin eventos
const fechasEspeciales = [
  ["RECESO", "2026-07-18"],
  ["RECESO", "2026-07-25"],
  ["SIN_ACTIVIDAD", "2026-10-17"],
  ["RECUPERO", "2026-11-21"],
];

// --- Fixture GIMNASIA (LP) --------------------------------------------------
// Por fecha: rival y si LP es LOCAL en el grupo 4-5-6 (el grupo 7-8-9 es espejo).
const fixture = [
  { f: 1, rival: "GIMNASIA", lp456Local: true },
  { f: 2, rival: "VÉLEZ SARSFIELD", lp456Local: false },
  { f: 3, rival: "BANFIELD", lp456Local: true },
  { f: 4, rival: "RACING CLUB", lp456Local: false },
  { f: 5, rival: "ROSARIO CENTRAL", lp456Local: true },
  { f: 6, rival: "GODOY CRUZ", lp456Local: false },
  { f: 7, rival: "PLATENSE", lp456Local: true },
  { f: 8, rival: "SARMIENTO", lp456Local: false },
  { f: 9, rival: "BELGRANO", lp456Local: true },
  { f: 10, rival: "ATLÉTICO RAFAELA", lp456Local: false },
  { f: 11, rival: "DEP. RIESTRA", lp456Local: true },
  { f: 12, rival: "ALDOSIVI", lp456Local: false },
  { f: 13, rival: "BOCA JUNIORS", lp456Local: true },
  { f: 14, rival: "COLÓN", lp456Local: false },
  { f: 15, rival: "HURACÁN", lp456Local: true },
  { f: 16, rival: "ESTUDIANTES (LP)", lp456Local: false },
  { f: 17, rival: "TIGRE", lp456Local: true },
  { f: 18, rival: "ATLÉTICO TUCUMÁN", lp456Local: false },
  { f: 19, rival: "IND. RIVADAVIA", lp456Local: true },
  { f: 20, rival: "FERRO", lp456Local: false },
  { f: 21, rival: "LANÚS", lp456Local: true },
  { f: 22, rival: "INDEPENDIENTE", lp456Local: false },
  { f: 23, rival: "NEWELL'S", lp456Local: true },
  { f: 24, rival: "SAN MARTÍN (SJ)", lp456Local: false },
  { f: 25, rival: "ARGENTINOS JRS.", lp456Local: true },
  { f: 26, rival: "INSTITUTO", lp456Local: false },
  { f: 27, rival: "TALLERES", lp456Local: true },
  { f: 28, rival: "ESTUDIANTES (RÍO IV)", lp456Local: false },
  { f: 29, rival: "BARRACAS CENTRAL", lp456Local: true },
  { f: 30, rival: "QUILMES", lp456Local: false },
  { f: 31, rival: "RIVER PLATE", lp456Local: true },
  { f: 32, rival: "UNIÓN", lp456Local: false },
  { f: 33, rival: "SAN LORENZO", lp456Local: true },
  { f: 34, rival: "DEF. Y JUSTICIA", lp456Local: true },
  { f: 35, rival: "CENTRAL CÓRDOBA", lp456Local: false },
];

// Multi-row parameterized insert helper.
async function insertRows(table, columns, rows) {
  if (rows.length === 0) return;
  const colList = columns.map((c) => `"${c}"`).join(", ");
  const params = [];
  const tuples = rows.map((row) => {
    const placeholders = columns.map((_, i) => `$${params.length + i + 1}`);
    params.push(...columns.map((c) => row[c]));
    return `(${placeholders.join(", ")})`;
  });
  await sql.query(
    `INSERT INTO "${table}" (${colList}) VALUES ${tuples.join(", ")}`,
    params
  );
}

async function main() {
  console.log("Seeding Calendario (Torneo Juveniles 2026)...");

  // 1. Clear (FK-safe order). NO borramos "categorias": tiene FK desde
  // "deportistas" (ON DELETE SET NULL) y borrarlas limpiaría asignaciones. El
  // catálogo se puebla de forma no destructiva (upsert por nombre) más abajo.
  await sql.query('DELETE FROM "eventos_torneo"');
  await sql.query('DELETE FROM "dias_calendario"');
  await sql.query('DELETE FROM "equipos"');
  console.log("  ✓ tablas limpiadas");

  // 2. Catálogo de categorías (upsert por nombre — idempotente, no destructivo)
  for (const c of catalogoCategorias) {
    await sql.query(
      `INSERT INTO "categorias" ("id", "nombre", "orden") VALUES ($1, $2, $3)
       ON CONFLICT ("nombre") DO UPDATE SET "orden" = EXCLUDED."orden"`,
      [randomUUID(), c.nombre, c.orden]
    );
  }
  // Releer ids reales (respeta filas preexistentes) para mapear el fixture.
  const catId = {}; // nombre -> id
  const catRows = await sql.query('SELECT id, nombre FROM "categorias"');
  for (const row of catRows) catId[row.nombre] = row.id;
  console.log(`  ✓ ${catalogoCategorias.length} categorías (catálogo completo)`);

  // 3. Equipos
  const equipoId = {}; // nombre -> id
  await insertRows(
    "equipos",
    ["id", "nombre", "es_gimnasia_lp"],
    equipoNombres.map((nombre) => {
      const id = randomUUID();
      equipoId[nombre] = id;
      return { id, nombre, es_gimnasia_lp: nombre === LP };
    })
  );
  console.log(`  ✓ ${equipoNombres.length} equipos`);

  // 4. Días de calendario
  const diaIdByNumero = {}; // numeroFecha -> id
  const diasRows = [];
  for (const [numero, fecha] of fechasTorneo) {
    const id = randomUUID();
    diaIdByNumero[numero] = id;
    diasRows.push({ id, fecha, tipo: "TORNEO", numero_fecha: numero });
  }
  for (const [tipo, fecha] of fechasEspeciales) {
    diasRows.push({ id: randomUUID(), fecha, tipo, numero_fecha: null });
  }
  await insertRows(
    "dias_calendario",
    ["id", "fecha", "tipo", "numero_fecha"],
    diasRows
  );
  console.log(`  ✓ ${diasRows.length} días (${fechasTorneo.length} torneo + ${fechasEspeciales.length} especiales)`);

  // 5. Eventos (6 por fecha: una fila por categoría)
  const eventosRows = [];
  for (const { f, rival, lp456Local } of fixture) {
    const diaId = diaIdByNumero[f];
    for (const cat of categoriasTorneo) {
      // 4-5-6 usa lp456Local; 7-8-9 es el espejo
      const lpLocal = grupo456.has(cat.nombre) ? lp456Local : !lp456Local;
      const localNombre = lpLocal ? LP : rival;
      const visitanteNombre = lpLocal ? rival : LP;
      eventosRows.push({
        id: randomUUID(),
        dia_calendario_id: diaId,
        categoria_id: catId[cat.nombre],
        local_id: equipoId[localNombre],
        visitante_id: equipoId[visitanteNombre],
        estado: "PROGRAMADO",
      });
    }
  }
  // Insert in chunks to keep each statement reasonable.
  const chunkSize = 30;
  for (let i = 0; i < eventosRows.length; i += chunkSize) {
    await insertRows(
      "eventos_torneo",
      ["id", "dia_calendario_id", "categoria_id", "local_id", "visitante_id", "estado"],
      eventosRows.slice(i, i + chunkSize)
    );
  }
  console.log(`  ✓ ${eventosRows.length} eventos GIMNASIA (LP)`);

  // 6. Verify counts
  const [counts] = await sql.query(`
    SELECT
      (SELECT COUNT(*) FROM "categorias") AS categorias,
      (SELECT COUNT(*) FROM "equipos") AS equipos,
      (SELECT COUNT(*) FROM "dias_calendario") AS dias,
      (SELECT COUNT(*) FROM "eventos_torneo") AS eventos
  `);
  console.log("\nConteos finales:", counts);
  console.log("✓ Seed completado.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
