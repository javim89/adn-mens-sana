/**
 * Club destino de los seeds y scripts de datos.
 *
 * Se elige con `--club <id>` (o `--club=<id>`) o con la variable SEED_CLUB_ID.
 * Sin ninguna de las dos va a Gimnasia, el primer cliente, que es donde vivían
 * todos los datos antes de multi-tenant.
 *
 * Usage: node scripts/seed-categorias.mjs --club club_prueba
 */

export const CLUB_DEFAULT = "club_gimnasia_lp";

export function getClubId(argv = process.argv.slice(2), env = process.env) {
  const i = argv.findIndex((a) => a === "--club" || a.startsWith("--club="));
  if (i !== -1) {
    const valor = argv[i].includes("=") ? argv[i].split("=")[1] : argv[i + 1];
    if (!valor || valor.startsWith("--")) {
      throw new Error("--club necesita un id de club");
    }
    return valor;
  }
  return env.SEED_CLUB_ID || CLUB_DEFAULT;
}

/** Corta el script si el club no existe: si no, el INSERT falla por la FK a mitad de camino. */
export async function assertClubExiste(sql, clubId) {
  const rows = await sql.query('SELECT "nombre" FROM "clubes" WHERE "id" = $1', [clubId]);
  if (rows.length === 0) {
    console.error(`El club "${clubId}" no existe en la tabla clubes.`);
    process.exit(1);
  }
  console.log(`  club: ${rows[0].nombre} (${clubId})`);
}

/**
 * userIds de Clerk de los miembros activos del club, agrupados por rol. Sale de
 * `membresias` y no de `publicMetadata.role`: el rol es por club, y así un seed de
 * un club no asigna profesionales de otro.
 */
export async function fetchProfesionalesPorRol(sql, clubId) {
  const rows = await sql.query(
    'SELECT "user_id", "rol" FROM "membresias" WHERE "club_id" = $1 AND "activo"',
    [clubId]
  );
  const porRol = {};
  for (const { user_id, rol } of rows) (porRol[rol] ??= []).push(user_id);
  return porRol;
}
