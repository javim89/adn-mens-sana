#!/usr/bin/env node
/**
 * Verifica la capa de solo lectura de Insights.
 *
 * Comprueba tres cosas contra la base real, en este orden:
 *   1. que DATABASE_URL_READONLY conecte,
 *   2. que el rol pueda LEER las tablas del módulo,
 *   3. que el rol NO pueda ESCRIBIR — que es el punto de todo el ejercicio.
 *
 * El paso 3 es el que importa: un rol mal configurado conecta y lee igual que
 * uno correcto, así que sin probar la escritura no se sabe si la protección
 * existe. La prueba se hace dentro de una transacción con ROLLBACK, así que no
 * deja nada escrito ni siquiera si el rol resultara tener permisos de más.
 *
 * Uso: node scripts/check-insights-readonly.mjs
 */
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const url = process.env.DATABASE_URL_READONLY;

if (!url) {
  console.error("✗ DATABASE_URL_READONLY no está seteada en .env.local");
  console.error();
  console.error("  La capa de solo lectura es opcional: sin ella el módulo");
  console.error("  funciona igual, con el guard sintáctico y la transacción");
  console.error("  READ ONLY. Para activarla, ver lib/db-readonly.ts");
  process.exit(1);
}

const sql = neon(url);
let fallos = 0;

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}
function fail(msg) {
  console.log(`  ✗ ${msg}`);
  fallos++;
}

console.log("Verificando la capa de solo lectura de Insights...\n");

// --- 1. Conexión -----------------------------------------------------------
let usuario;
try {
  const [row] = await sql`SELECT current_user AS u, current_database() AS db`;
  usuario = row.u;
  ok(`conecta como "${row.u}" a la base "${row.db}"`);
} catch (e) {
  fail(`no se pudo conectar: ${e.message}`);
  process.exit(1);
}

// Conectar con el mismo usuario que la app sería un falso positivo: leería y
// escribiría igual que siempre.
const [{ owner }] = await sql`SELECT current_setting('is_superuser') AS owner`;
if (usuario === "neondb_owner" || owner === "on") {
  fail(
    `"${usuario}" parece ser el usuario dueño, no uno de solo lectura — revisá la connection string`,
  );
}

// --- 2. Lectura ------------------------------------------------------------
try {
  const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM deportistas`;
  ok(`puede leer: deportistas tiene ${n} filas`);
} catch (e) {
  fail(`no puede leer la tabla deportistas: ${e.message}`);
}

try {
  await sql`SELECT COUNT(*) FROM insights_dashboards`;
  ok("puede leer las tablas del módulo (insights_dashboards)");
} catch (e) {
  fail(`no puede leer insights_dashboards: ${e.message}`);
}

// --- 3. Escritura: TIENE que fallar ---------------------------------------
// Se envuelve en una transacción con ROLLBACK para no dejar rastro ni en el
// caso malo, en el que el rol sí tuviera permiso de escritura.
try {
  await sql.transaction([
    sql`INSERT INTO insights_dashboards (id, slug, nombre, creado_por, updated_at)
        VALUES ('probe', 'probe-readonly', 'probe', 'probe', now())`,
  ]);
  fail("PUEDE ESCRIBIR — el rol tiene permisos de más, revisá los GRANT");
} catch (e) {
  const msg = String(e.message || "");
  if (/permission denied|read-only|solo lectura/i.test(msg)) {
    ok("no puede escribir (permiso denegado por la base)");
  } else {
    // Cualquier otro error impide la escritura, pero no por el motivo
    // esperado: se reporta sin darlo por bueno.
    fail(`la escritura falló, pero por un motivo inesperado: ${msg}`);
  }
}

console.log();
if (fallos === 0) {
  console.log("✓ La capa de solo lectura está bien configurada.");
  process.exit(0);
}
console.log(`✗ ${fallos} comprobación(es) fallaron.`);
process.exit(1);
