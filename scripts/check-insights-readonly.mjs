#!/usr/bin/env node
/**
 * Verifica la capa de solo lectura de Insights.
 *
 * Comprueba contra la base real, en este orden:
 *   1. que DATABASE_URL_READONLY conecte,
 *   2. que el rol pueda LEER las tablas del módulo (con un token de sesión),
 *   3. que el rol NO pueda ESCRIBIR — que es el punto de todo el ejercicio,
 *   4. multi-tenant: que toda tabla legible tenga RLS, que las sensibles no se
 *      lean, que sin token no se vea nada, que con el token de un club se vea
 *      exactamente lo de ese club (comparado contra el prelude, corrido como
 *      owner) y que los trucos de bypass (set_config, "set_config",
 *      query_to_xml, public.x, pg_stats, token vencido, SET ROLE) no filtren.
 *
 * El paso 4 usa además DATABASE_URL (owner) para crear tokens en
 * `insights_sesiones` como lo hace el runner, y los borra al terminar.
 *
 * El paso 3 es el que importa: un rol mal configurado conecta y lee igual que
 * uno correcto, así que sin probar la escritura no se sabe si la protección
 * existe. La prueba se hace dentro de una transacción con ROLLBACK, así que no
 * deja nada escrito ni siquiera si el rol resultara tener permisos de más.
 *
 * Uso: node scripts/check-insights-readonly.mjs
 */
import { randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import tablas from "../lib/insights/tenant-tablas.json" with { type: "json" };

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
const ownerUrl = process.env.DATABASE_URL;
if (!ownerUrl) {
  console.error("✗ DATABASE_URL no está seteada: hace falta para crear los tokens de prueba");
  process.exit(1);
}
const owner = neon(ownerUrl);
let fallos = 0;
const tokensCreados = [];

/** Crea un token de `insights_sesiones` como el runner (vence en `ttlSegundos`). */
async function crearToken(clubId, ttlSegundos = 60) {
  const token = randomBytes(32).toString("hex");
  await owner`INSERT INTO insights_sesiones (token, club_id, expira)
    VALUES (${token}, ${clubId}, (now() AT TIME ZONE 'UTC') + make_interval(secs => ${ttlSegundos}))`;
  tokensCreados.push(token);
  return token;
}

/** Corre `consulta` como insights_ro con el token seteado, en una tx read-only. Devuelve sus filas. */
async function comoClub(token, consulta) {
  const resultados = await sql.transaction(
    (tx) => [
      tx`SELECT set_config('app.insights_token', ${token}, true)`,
      ...(Array.isArray(consulta) ? consulta : [consulta]).map((q) => (typeof q === "string" ? tx.query(q) : q(tx))),
    ],
    { readOnly: true },
  );
  return resultados.at(-1);
}

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
const [{ superuser }] = await sql`SELECT current_setting('is_superuser') AS superuser`;
if (usuario === "neondb_owner" || superuser === "on") {
  fail(
    `"${usuario}" parece ser el usuario dueño, no uno de solo lectura — revisá la connection string`,
  );
}

// --- 2. Lectura ------------------------------------------------------------
// Con RLS, sin token no se ve nada: se lee como el club con más deportistas.
const clubes = await owner`
  SELECT c.id, c.nombre, (SELECT COUNT(*)::int FROM deportistas d WHERE d.club_id = c.id) AS deportistas
  FROM clubes c ORDER BY 3 DESC, c.created_at`;
const principal = clubes[0];
const tokenPrincipal = await crearToken(principal.id);

try {
  const [{ n }] = await comoClub(tokenPrincipal, (tx) => tx`SELECT COUNT(*)::int AS n FROM deportistas`);
  ok(`puede leer: deportistas tiene ${n} filas de "${principal.nombre}"`);
} catch (e) {
  fail(`no puede leer la tabla deportistas: ${e.message}`);
}

try {
  await comoClub(tokenPrincipal, (tx) => tx`SELECT COUNT(*) FROM insights_dashboards`);
  ok("puede leer las tablas del módulo (insights_dashboards)");
} catch (e) {
  fail(`no puede leer insights_dashboards: ${e.message}`);
}

try {
  const [{ n }] = await comoClub(tokenPrincipal, (tx) => tx`SELECT COUNT(*)::int AS n FROM entregas_comida`);
  ok(`puede leer: entregas_comida tiene ${n} filas`);
} catch (e) {
  fail(`no puede leer la tabla entregas_comida: ${e.message}`);
}

// Las dos columnas de elegibilidad son las que alimentan el CTE de cobertura.
try {
  await comoClub(tokenPrincipal, (tx) => tx`SELECT recibe_almuerzo, recibe_cena FROM necesidades_apoyo LIMIT 1`);
  ok("puede leer necesidades_apoyo.recibe_almuerzo / recibe_cena");
} catch (e) {
  fail(`no puede leer las columnas de elegibilidad de vianda: ${e.message}`);
}

// --- 3. Escritura: TIENE que fallar ---------------------------------------
// Se envuelve en una transacción con ROLLBACK para no dejar rastro ni en el
// caso malo, en el que el rol sí tuviera permiso de escritura.
try {
  await sql.transaction([
    sql`INSERT INTO insights_dashboards (id, club_id, slug, nombre, creado_por, updated_at)
        VALUES ('probe', 'club_gimnasia_lp', 'probe-readonly', 'probe', 'probe', now())`,
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

// --- 4. Multi-tenant -------------------------------------------------------
console.log("\nAislamiento por club (RLS de insights_ro)...\n");

const IDENT_RE = /^[a-z_][a-z0-9_]*$/;
function ident(nombre) {
  if (!IDENT_RE.test(nombre)) throw new Error(`Identificador inválido: ${nombre}`);
  return nombre;
}

/** Mismo prelude que lib/insights/tenant-prelude.ts, para calcular lo esperado como owner. */
const PRELUDE =
  "WITH " +
  [
    `${ident(tablas.club)} AS NOT MATERIALIZED (SELECT * FROM public.${tablas.club} WHERE id = $1)`,
    ...tablas.tablas.map(({ tabla, padre, fk }) =>
      padre
        ? `${ident(tabla)} AS NOT MATERIALIZED (SELECT * FROM public.${tabla} __t WHERE EXISTS (SELECT 1 FROM ${ident(padre)} __p WHERE __p.id = __t.${ident(fk)}))`
        : `${ident(tabla)} AS NOT MATERIALIZED (SELECT * FROM public.${tabla} WHERE club_id = $1)`,
    ),
  ].join(",\n");
const legibles = [tablas.club, ...tablas.tablas.map((t) => t.tabla)];

// 4a. Toda tabla legible por el rol tiene RLS.
const sinRls = await sql`
  SELECT c.relname AS tabla FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm')
    AND has_table_privilege(c.oid, 'SELECT') AND NOT c.relrowsecurity`;
if (sinRls.length === 0) ok("toda tabla de public legible por el rol tiene RLS habilitada");
else fail(`tablas legibles SIN RLS: ${sinRls.map((r) => r.tabla).join(", ")} — correr setup-insights-rls.mjs`);

// 4b. Las tablas sensibles no se pueden leer ni con token.
for (const tabla of tablas.excluidas) {
  try {
    await comoClub(tokenPrincipal, `SELECT 1 FROM public.${ident(tabla)} LIMIT 1`);
    fail(`puede leer ${tabla}`);
  } catch (e) {
    if (/permission denied/i.test(e.message)) ok(`no puede leer ${tabla}`);
    else fail(`leer ${tabla} falló por un motivo inesperado: ${e.message}`);
  }
}

// 4c. Sin token no ve ninguna fila.
{
  const conFilas = [];
  for (const tabla of legibles) {
    const [{ n }] = await sql.query(`SELECT COUNT(*)::int AS n FROM public.${ident(tabla)}`);
    if (n > 0) conFilas.push(`${tabla} (${n})`);
  }
  if (conFilas.length === 0) ok(`sin token ve 0 filas en las ${legibles.length} tablas legibles`);
  else fail(`sin token ve filas en: ${conFilas.join(", ")}`);
}

// 4d. Con el token de cada club ve exactamente lo del club.
const tokens = new Map([[principal.id, tokenPrincipal]]);
for (const club of clubes) {
  const token = tokens.get(club.id) ?? (await crearToken(club.id));
  tokens.set(club.id, token);
  const distintos = [];
  let total = 0;
  for (const tabla of legibles) {
    const [{ n: esperado }] = await owner.query(`${PRELUDE}\nSELECT COUNT(*)::int AS n FROM ${ident(tabla)}`, [club.id]);
    const [{ n: visto }] = await comoClub(token, `SELECT COUNT(*)::int AS n FROM public.${ident(tabla)}`);
    total += visto;
    if (esperado !== visto) distintos.push(`${tabla}: esperado ${esperado}, visto ${visto}`);
  }
  if (distintos.length === 0) ok(`con el token de "${club.nombre}" ve solo sus filas (${total} en total)`);
  else fail(`con el token de "${club.nombre}" las filas no coinciden: ${distintos.join("; ")}`);
}

// 4e. Trucos de bypass, con el token del club con MENOS deportistas
//     (si solo hay un club, se prueba sin filas ajenas que filtrar).
const victima = principal;
const atacante = clubes.at(-1);
if (atacante.id === victima.id) {
  console.log("  · hay un solo club: las pruebas de bypass entre clubes no aplican");
} else {
  const tokenAtacante = tokens.get(atacante.id);
  const ajenas = `SELECT COUNT(*)::int AS n FROM public.deportistas WHERE club_id <> '${atacante.id.replace(/'/g, "''")}'`;
  const intentos = [
    ["public.deportistas directo", [ajenas]],
    ["set_config a un token inventado", ["SELECT set_config('app.insights_token', 'inventado', true)", ajenas]],
    [`"set_config" al id del otro club`, [`SELECT "set_config"('app.insights_token', '${victima.id}', true)`, ajenas]],
    [
      "query_to_xml",
      [
        `SELECT (xpath('//n/text()', query_to_xml('${ajenas.replace(/'/g, "''")}', false, false, '')))[1]::text::int AS n`,
      ],
    ],
    ["clubes del otro club", [`SELECT COUNT(*)::int AS n FROM public.clubes WHERE id = '${victima.id}'`]],
    [
      "hijo sin club_id (datos_salud)",
      [
        `SELECT COUNT(*)::int AS n FROM public.datos_salud ds JOIN public.deportistas d ON d.id = ds.deportista_id WHERE d.club_id <> '${atacante.id}'`,
      ],
    ],
    ["pg_stats de deportistas", ["SELECT COUNT(*)::int AS n FROM pg_stats WHERE schemaname = 'public' AND tablename = 'deportistas'"]],
  ];
  for (const [nombre, consultas] of intentos) {
    try {
      const [{ n }] = await comoClub(tokenAtacante, consultas);
      if (n === 0) ok(`bypass "${nombre}": 0 filas ajenas`);
      else if (n === null || n === undefined) fail(`bypass "${nombre}": la prueba no devolvió un número`);
      else fail(`bypass "${nombre}" FILTRA ${n} filas de otro club`);
    } catch (e) {
      ok(`bypass "${nombre}": rechazado (${e.message.split("\n")[0]})`);
    }
  }

  // El club que resuelve la función es el del token, no otro.
  try {
    const [{ club }] = await comoClub(tokenAtacante, "SELECT public.insights_club_actual() AS club");
    if (club === atacante.id) ok("insights_club_actual() devuelve el club del token");
    else fail(`insights_club_actual() devolvió ${club}`);
  } catch (e) {
    fail(`insights_club_actual() no se puede llamar: ${e.message.split("\n")[0]}`);
  }

  // Token vencido: no ve nada.
  const vencido = await crearToken(victima.id, -1);
  const [{ n: conVencido }] = await comoClub(vencido, "SELECT COUNT(*)::int AS n FROM public.deportistas");
  if (conVencido === 0) ok("un token vencido no ve filas");
  else fail(`un token vencido ve ${conVencido} filas`);

  // Cambiar de rol desde un SELECT no está permitido.
  try {
    await comoClub(tokenAtacante, "SELECT set_config('role', 'neondb_owner', true)");
    fail("set_config('role', …) a owner NO falló");
  } catch (e) {
    ok(`set_config('role', owner) rechazado (${e.message.split("\n")[0]})`);
  }
}

if (tokensCreados.length > 0) {
  await owner`DELETE FROM insights_sesiones WHERE token = ANY(${tokensCreados})`;
}

console.log();
if (fallos === 0) {
  console.log("✓ La capa de solo lectura está bien configurada.");
  process.exit(0);
}
console.log(`✗ ${fallos} comprobación(es) fallaron.`);
process.exit(1);
