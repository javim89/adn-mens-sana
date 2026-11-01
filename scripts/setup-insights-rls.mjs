#!/usr/bin/env node
/**
 * Configura las RLS por club del rol `insights_ro` (segunda capa multi-tenant
 * de Insights; la primera es el prelude de `lib/insights/tenant-prelude.ts`).
 *
 * Idempotente: se puede correr las veces que haga falta, y HAY que volver a
 * correrlo cada vez que una migración agrega una tabla (después de clasificarla
 * en `lib/insights/tenant-tablas.json`).
 *
 * Qué hace, con la conexión dueña (`DATABASE_URL`):
 *   1. Verifica que el usuario dueño sea owner de todas las tablas (o tenga
 *      BYPASSRLS). Sin eso, habilitar RLS dejaría a la app sin datos.
 *   2. Crea `insights_club_actual()`, SECURITY DEFINER: resuelve el token de
 *      `app.insights_token` contra `insights_sesiones` (vigente) a un club_id.
 *   3. En cada tabla legible (`tenant-tablas.json` + `clubes`): ENABLE RLS y
 *      una policy FOR SELECT TO insights_ro. Raíces por club_id, hijos por
 *      EXISTS sobre el padre (cuya RLS aplica a su vez), clubes por id.
 *   4. Recién después, GRANT SELECT sobre esas tablas y REVOKE sobre todo lo
 *      demás (membresias, invitaciones, superadmins, insights_sesiones,
 *      _prisma_migrations y cualquier tabla sin clasificar). También quita el
 *      ALTER DEFAULT PRIVILEGES que hacía legibles las tablas nuevas: una tabla
 *      nueva queda ilegible para Insights hasta clasificarla (falla cerrado).
 *
 * Sin FORCE ROW LEVEL SECURITY: el owner (la app) bypasea las policies, así
 * que la app no cambia. Las sentencias se corren de a una por el driver HTTP
 * de Neon (no por apply-migration.mjs: el cuerpo $$ de la función tiene ';').
 *
 * Uso: node scripts/setup-insights-rls.mjs
 */
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import tablas from "../lib/insights/tenant-tablas.json" with { type: "json" };

config({ path: ".env.local", quiet: true });

const ROL = "insights_ro";
const POLICY = "insights_por_club";
const IDENT_RE = /^[a-z_][a-z0-9_]*$/;

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("✗ DATABASE_URL no está seteada");
  process.exit(1);
}
const sql = neon(url);

function ident(nombre) {
  if (!IDENT_RE.test(nombre)) throw new Error(`Identificador inválido: ${nombre}`);
  return nombre;
}

async function run(descripcion, sentencia) {
  try {
    await sql.query(sentencia);
    console.log(`  ✓ ${descripcion}`);
  } catch (e) {
    console.error(`  ✗ ${descripcion}: ${e.message}`);
    process.exit(1);
  }
}

console.log("Configurando las RLS de Insights...\n");

// --- 0. Precondiciones -----------------------------------------------------
const [{ usuario, bypass }] = await sql`
  SELECT current_user AS usuario, rolbypassrls AS bypass FROM pg_roles WHERE rolname = current_user`;
const [{ existe }] = await sql`SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ${ROL}) AS existe`;
if (!existe) {
  console.error(`✗ El rol ${ROL} no existe. Crearlo primero (ver lib/db-readonly.ts).`);
  process.exit(1);
}

const publicas = await sql`
  SELECT c.relname AS tabla, pg_get_userbyid(c.relowner) AS owner
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')`;
const ajenas = publicas.filter((t) => t.owner !== usuario);
if (ajenas.length > 0 && !bypass) {
  console.error(
    `✗ "${usuario}" no es owner de: ${ajenas.map((t) => t.tabla).join(", ")}. ` +
      "Con RLS habilitada la app dejaría de ver esas tablas. Abortado.",
  );
  process.exit(1);
}
console.log(`  ✓ "${usuario}" es owner de las ${publicas.length} tablas de public (bypasea las RLS)`);

const existentes = new Set(publicas.map((t) => t.tabla));
const legibles = [{ tabla: tablas.club, club: true }, ...tablas.tablas];
const faltantes = legibles.filter((t) => !existentes.has(t.tabla));
if (faltantes.length > 0) {
  console.error(`✗ tenant-tablas.json nombra tablas que no existen: ${faltantes.map((t) => t.tabla).join(", ")}`);
  process.exit(1);
}

// --- 1. Función que resuelve el token --------------------------------------
// `expira` es TIMESTAMP sin zona escrito en UTC por Prisma: se compara contra
// now() en UTC para no depender del TimeZone de la sesión.
await run(
  "función insights_club_actual()",
  `CREATE OR REPLACE FUNCTION public.insights_club_actual() RETURNS text
   LANGUAGE sql STABLE SECURITY DEFINER
   SET search_path = pg_catalog, pg_temp
   AS $fn$
     SELECT s.club_id FROM public.insights_sesiones s
     WHERE s.token = current_setting('app.insights_token', true)
       AND s.expira > (now() AT TIME ZONE 'UTC')
   $fn$`,
);
await run("REVOKE EXECUTE de PUBLIC", "REVOKE ALL ON FUNCTION public.insights_club_actual() FROM PUBLIC");
await run(`GRANT EXECUTE a ${ROL}`, `GRANT EXECUTE ON FUNCTION public.insights_club_actual() TO ${ROL}`);

// --- 2. RLS + policy en cada tabla legible ---------------------------------
const CLUB_ACTUAL = "(SELECT public.insights_club_actual())";
for (const t of legibles) {
  const tabla = ident(t.tabla);
  let using;
  if (t.club) using = `id = ${CLUB_ACTUAL}`;
  else if (!t.padre) using = `club_id = ${CLUB_ACTUAL}`;
  else using = `EXISTS (SELECT 1 FROM public.${ident(t.padre)} __p WHERE __p.id = ${tabla}.${ident(t.fk)})`;

  await run(`${tabla}: ENABLE RLS`, `ALTER TABLE public.${tabla} ENABLE ROW LEVEL SECURITY`);
  await run(`${tabla}: drop policy previa`, `DROP POLICY IF EXISTS ${POLICY} ON public.${tabla}`);
  await run(
    `${tabla}: policy (${t.club ? "id" : t.padre ? `EXISTS ${t.padre}` : "club_id"})`,
    `CREATE POLICY ${POLICY} ON public.${tabla} AS PERMISSIVE FOR SELECT TO ${ROL} USING (${using})`,
  );
}

// --- 3. Permisos: SELECT solo en lo clasificado ----------------------------
await run(`USAGE en public a ${ROL}`, `GRANT USAGE ON SCHEMA public TO ${ROL}`);
for (const t of legibles) {
  await run(`GRANT SELECT ${t.tabla}`, `GRANT SELECT ON public.${ident(t.tabla)} TO ${ROL}`);
}

const nombresLegibles = new Set(legibles.map((t) => t.tabla));
for (const { tabla } of publicas) {
  if (nombresLegibles.has(tabla)) continue;
  await run(`REVOKE ${tabla}`, `REVOKE ALL ON public.${ident(tabla)} FROM ${ROL}`);
}
await run(
  "las tablas nuevas ya no son legibles por defecto",
  `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT ON TABLES FROM ${ROL}`,
);

// --- 4. Resumen ------------------------------------------------------------
const sinRls = await sql`
  SELECT c.relname AS tabla FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm')
    AND has_table_privilege(${ROL}, c.oid, 'SELECT') AND NOT c.relrowsecurity`;
console.log();
if (sinRls.length > 0) {
  console.error(`✗ ${ROL} puede leer tablas sin RLS: ${sinRls.map((r) => r.tabla).join(", ")}`);
  process.exit(1);
}
console.log(`✓ RLS configuradas: ${legibles.length} tablas legibles por ${ROL}, todas con policy.`);
console.log("  Verificar con: node scripts/check-insights-readonly.mjs");
