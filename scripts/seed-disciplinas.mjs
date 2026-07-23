#!/usr/bin/env node
/**
 * Seeds the "disciplinas" catalog and its category links.
 * Uses Neon's HTTP driver (avoids the TCP/IPv6 issue like apply-migration.mjs).
 *
 * (a) Upsert de las 21 disciplinas por "codigo" (ON CONFLICT DO UPDATE).
 * (b) Vincula Fútbol -> las 15 categorías en "disciplina_categorias"
 *     (idempotente, ON CONFLICT DO NOTHING). Otras disciplinas quedan sin
 *     categorías por ahora.
 *
 * ⚠️  IDEMPOTENCIA: upsert por "codigo" / link por (disciplina_id, categoria_id).
 * Re-correr no duplica ni destruye asignaciones existentes.
 *
 * Usage: node scripts/seed-disciplinas.mjs
 */
import { randomUUID } from "crypto";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}
const sql = neon(url);

// codigo = valor del enum original, nombre = label español, orden = 1..21.
export const catalogoDisciplinas = [
  { codigo: "FUTBOL", nombre: "Fútbol", orden: 1 },
  { codigo: "FUTSAL", nombre: "Futsal", orden: 2 },
  { codigo: "BASQUET", nombre: "Básquet", orden: 3 },
  { codigo: "VOLEY", nombre: "Vóley", orden: 4 },
  { codigo: "HANDBALL", nombre: "Handball", orden: 5 },
  { codigo: "NATACION", nombre: "Natación", orden: 6 },
  { codigo: "ATLETISMO", nombre: "Atletismo", orden: 7 },
  { codigo: "HOCKEY", nombre: "Hockey", orden: 8 },
  { codigo: "RUGBY", nombre: "Rugby", orden: 9 },
  { codigo: "TENIS", nombre: "Tenis", orden: 10 },
  { codigo: "GIMNASIA", nombre: "Gimnasia", orden: 11 },
  { codigo: "GIMNASIA_ARTISTICA", nombre: "Gimnasia Artística", orden: 12 },
  { codigo: "PATIN", nombre: "Patín", orden: 13 },
  { codigo: "ARTES_MARCIALES", nombre: "Artes Marciales", orden: 14 },
  { codigo: "COMBATE", nombre: "Combate", orden: 15 },
  { codigo: "INICIACION_DEPORTIVA", nombre: "Iniciación Deportiva", orden: 16 },
  { codigo: "POWER_CHAIR", nombre: "Power Chair", orden: 17 },
  { codigo: "TIADE", nombre: "TIADE", orden: 18 },
  { codigo: "AJEDREZ", nombre: "Ajedrez", orden: 19 },
  { codigo: "BOXEO", nombre: "Boxeo", orden: 20 },
  { codigo: "OTRO", nombre: "Otro", orden: 21 },
];

async function main() {
  console.log("Seeding Disciplinas (catálogo)...");

  // (a) Upsert por codigo — idempotente, no destructivo.
  for (const d of catalogoDisciplinas) {
    await sql.query(
      `INSERT INTO "disciplinas" ("id", "nombre", "codigo", "orden") VALUES ($1, $2, $3, $4)
       ON CONFLICT ("codigo") DO UPDATE SET "nombre" = EXCLUDED."nombre", "orden" = EXCLUDED."orden"`,
      [randomUUID(), d.nombre, d.codigo, d.orden]
    );
  }
  console.log(`  ✓ ${catalogoDisciplinas.length} disciplinas upserted`);

  // (b) Vincular Fútbol -> todas las categorías.
  const futbolRows = await sql.query('SELECT id FROM "disciplinas" WHERE codigo = $1', ["FUTBOL"]);
  if (futbolRows.length === 0) {
    console.error("No se encontró la disciplina FUTBOL");
    process.exit(1);
  }
  const futbolId = futbolRows[0].id;

  const categorias = await sql.query('SELECT id, nombre FROM "categorias"');
  if (categorias.length === 0) {
    console.warn("  ~ no hay categorías; corré primero: node scripts/seed-categorias.mjs");
  }

  for (const cat of categorias) {
    await sql.query(
      `INSERT INTO "disciplina_categorias" ("id", "disciplina_id", "categoria_id") VALUES ($1, $2, $3)
       ON CONFLICT ("disciplina_id", "categoria_id") DO NOTHING`,
      [randomUUID(), futbolId, cat.id]
    );
  }
  console.log(`  ✓ Fútbol vinculado a ${categorias.length} categorías`);

  const [{ total }] = await sql.query('SELECT COUNT(*)::int AS total FROM "disciplinas"');
  console.log(`\nConteos finales: ${total} disciplinas en la DB.`);
  console.log("✓ Seed completado.");
}

// Sólo ejecutar main() si se corre directo (no cuando se importa el catálogo).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
}
