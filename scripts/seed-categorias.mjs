#!/usr/bin/env node
/**
 * Seeds the "categorias" catalog (single source of truth).
 * Uses Neon's HTTP driver (avoids the TCP/IPv6 issue like apply-migration.mjs).
 *
 * Catálogo completo de 15 categorías. Las 6 de torneo (orden 1..6) alimentan el
 * fixture de seed-calendario.mjs; el resto (orden 7..15) sólo pobla el catálogo
 * para el ABM de deportistas.
 *
 * ⚠️  IDEMPOTENCIA: upsert por (club, "nombre") (ON CONFLICT DO UPDATE). NO borra
 * categorías existentes ni sus asignaciones — "deportistas" tiene FK
 * (ON DELETE SET NULL) hacia esta tabla. Re-correr no duplica.
 *
 * Usage: node scripts/seed-categorias.mjs [--club <id>]   (default: club_gimnasia_lp)
 */
import { randomUUID } from "crypto";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { getClubId, assertClubExiste } from "./club-arg.mjs";
import catalogos from "../lib/catalogos/catalogos-default.json" with { type: "json" };

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
// Vive en lib/catalogos/catalogos-default.json: lo comparte con `crearClub`.
export const catalogoCategorias = catalogos.categorias;

async function main() {
  console.log("Seeding Categorías (catálogo)...");
  const clubId = getClubId();
  await assertClubExiste(sql, clubId);

  // Upsert por nombre — idempotente, no destructivo (respeta asignaciones desde
  // "deportistas", que referencian por FK con ON DELETE SET NULL).
  for (const c of catalogoCategorias) {
    await sql.query(
      `INSERT INTO "categorias" ("id", "club_id", "nombre", "orden") VALUES ($1, $2, $3, $4)
       ON CONFLICT ("club_id", "nombre") DO UPDATE SET "orden" = EXCLUDED."orden"`,
      [randomUUID(), clubId, c.nombre, c.orden]
    );
  }

  const [{ total }] = await sql.query('SELECT COUNT(*)::int AS total FROM "categorias" WHERE "club_id" = $1', [clubId]);
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
