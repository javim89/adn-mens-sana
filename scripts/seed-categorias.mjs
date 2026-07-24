#!/usr/bin/env node
/**
 * Seeds the "categorias" catalog (single source of truth).
 * Uses Neon's HTTP driver (avoids the TCP/IPv6 issue like apply-migration.mjs).
 *
 * Catálogo completo de 15 categorías. Las 6 de torneo (orden 1..6) alimentan el
 * fixture de seed-calendario.mjs; el resto (orden 7..15) sólo pobla el catálogo
 * para el ABM de deportistas.
 *
 * ⚠️  IDEMPOTENCIA: upsert por "nombre" (ON CONFLICT DO UPDATE). NO borra
 * categorías existentes ni sus asignaciones — "deportistas" tiene FK
 * (ON DELETE SET NULL) hacia esta tabla. Re-correr no duplica.
 *
 * Usage: node scripts/seed-categorias.mjs
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

// --- Categorías -------------------------------------------------------------
// Catálogo completo (15). Las 6 de torneo (orden 1..6) alimentan el fixture; las
// nuevas (orden 7..15) sólo pobla el catálogo para el ABM de deportistas.
export const catalogoCategorias = [
  { nombre: "4ta", orden: 1 },
  { nombre: "5ta", orden: 2 },
  { nombre: "6ta", orden: 3 },
  { nombre: "7ma", orden: 4 },
  { nombre: "8va", orden: 5 },
  { nombre: "9na", orden: 6 },
  { nombre: "SUB-12", orden: 7 },
  { nombre: "SUB-14", orden: 8 },
  { nombre: "SUB-16", orden: 9 },
  { nombre: "SUB-18", orden: 10 },
  { nombre: "Reserva", orden: 11 },
  { nombre: "División de Honor", orden: 12 },
  { nombre: "Primera", orden: 13 },
  { nombre: "Senior", orden: 14 },
  { nombre: "Veteranos", orden: 15 },
];

async function main() {
  console.log("Seeding Categorías (catálogo)...");

  // Upsert por nombre — idempotente, no destructivo (respeta asignaciones desde
  // "deportistas", que referencian por FK con ON DELETE SET NULL).
  for (const c of catalogoCategorias) {
    await sql.query(
      `INSERT INTO "categorias" ("id", "nombre", "orden") VALUES ($1, $2, $3)
       ON CONFLICT ("nombre") DO UPDATE SET "orden" = EXCLUDED."orden"`,
      [randomUUID(), c.nombre, c.orden]
    );
  }

  const [{ total }] = await sql.query('SELECT COUNT(*)::int AS total FROM "categorias"');
  console.log(`  ✓ ${catalogoCategorias.length} categorías upserted (${total} en la DB)`);
  console.log("✓ Seed completado.");
}

// Sólo ejecutar main() si se corre directo (no cuando se importa el catálogo).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
}
