#!/usr/bin/env node
/**
 * Applies a Prisma migration using Neon's HTTP driver instead of TCP.
 * Use this when the direct TCP connection to Neon fails (e.g. IPv6 networks).
 *
 * Usage: node scripts/apply-migration.mjs <migration-dir>
 * Example: node scripts/apply-migration.mjs 20260625000000_add_datos_salud
 */
import { readFileSync } from "fs";
import { createHash } from "crypto";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import path from "path";

config({ path: ".env.local" });

const migrationName = process.argv[2];
if (!migrationName) {
  console.error("Usage: node scripts/apply-migration.mjs <migration-dir-name>");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = neon(url);

const migrationPath = path.join("prisma/migrations", migrationName, "migration.sql");
const migrationSql = readFileSync(migrationPath, "utf8");
const checksum = createHash("sha256").update(migrationSql).digest("hex");

// Split into individual statements (split on semicolons, skip empty)
const statements = migrationSql
  .split(";")
  .map((s) => s.trim())
  // Remove comment-only blocks; keep anything that contains real SQL keywords
  .filter((s) => s.length > 0 && /^\s*(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE)/im.test(s))
  // Strip leading comment lines from each statement
  .map((s) => s.replace(/^(--[^\n]*\n)+/g, "").trim())
  .filter((s) => s.length > 0);

console.log(`Applying migration: ${migrationName}`);
console.log(`Statements to execute: ${statements.length}`);

for (const statement of statements) {
  try {
    await sql.query(statement);
    console.log(`  ✓ ${statement.slice(0, 60).replace(/\n/g, " ")}...`);
  } catch (err) {
    if (err.message?.includes("already exists")) {
      console.log(`  ~ already exists, skipping`);
    } else {
      console.error(`  ✗ Failed: ${err.message}`);
      process.exit(1);
    }
  }
}

// Record in _prisma_migrations (Prisma 7 schema)
try {
  await sql.query(
    `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
     SELECT gen_random_uuid()::text, $1::text, NOW(), $2::text, NULL, NULL, NOW(), 1
     WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = $2::text)`,
    [checksum, migrationName]
  );
  console.log(`\n✓ Migration "${migrationName}" applied and recorded.`);
} catch (err) {
  console.warn(`Warning: could not record in _prisma_migrations: ${err.message}`);
  console.log(`\n✓ Migration SQL applied (record skipped).`);
}
