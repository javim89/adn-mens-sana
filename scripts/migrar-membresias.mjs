#!/usr/bin/env node
/**
 * Pasa los roles de Clerk (`publicMetadata.role` / `lugarRetiro`) a la tabla
 * `membresias`, en el club de Gimnasia (o el de --club). Una sola vez por
 * ambiente, al pasar a multi-tenant.
 *
 * - Usuarios: una membresía por usuario con un rol válido. `activo = !banned`
 *   (antes se deshabilitaba con banUser; ahora se desactiva la membresía).
 * - Invitaciones pendientes de Clerk: se importan a `invitaciones` para que, al
 *   aceptarlas, el usuario reciba su membresía. El token es aleatorio y no se usa:
 *   se aceptan por mail verificado.
 *
 * Idempotente: ON CONFLICT (user_id, club_id) DO NOTHING y las invitaciones se
 * saltean si ya está su clerk_invitation_id. No modifica Clerk: el
 * `publicMetadata.role` queda como rollback.
 *
 * Usage: node scripts/migrar-membresias.mjs [--dry-run] [--club <id>]
 */
import { createHash, randomBytes, randomUUID } from "crypto";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { getClubId, assertClubExiste } from "./club-arg.mjs";

config({ path: ".env.local", quiet: true });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}
if (!process.env.CLERK_SECRET_KEY) {
  console.error("CLERK_SECRET_KEY not set");
  process.exit(1);
}
const sql = neon(url);
const dryRun = process.argv.includes("--dry-run");

// Los de lib/roles.ts y el enum AppRole / LugarRetiro del schema.
const ROLES = [
  "admin", "entrenador", "medico", "kinesiologo", "nutricionista",
  "psicologo", "cardiologo", "social", "responsable_viandas",
];
const LUGARES = ["BOSQUESITO", "SEDE", "ESTANCIA_CHICA"];
const PAGINA = 100;
// Clerk no siempre informa vencimiento: la invitación propia vence a los 30 días.
const VENCIMIENTO_DEFAULT_MS = 30 * 24 * 60 * 60 * 1000;

const meta = (x) => (x.publicMetadata ?? {});
const lugarDe = (m) => (LUGARES.includes(m.lugarRetiro) ? m.lugarRetiro : null);
const emailDe = (u) =>
  u.emailAddresses?.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ??
  u.emailAddresses?.[0]?.emailAddress ??
  "";

async function todas(listar) {
  const out = [];
  for (let offset = 0; ; offset += PAGINA) {
    const { data } = await listar({ limit: PAGINA, offset });
    out.push(...data);
    if (data.length < PAGINA) return out;
  }
}

async function main() {
  console.log(`Migrando membresías desde Clerk${dryRun ? " (DRY RUN, no escribe)" : ""}...`);
  const clubId = getClubId();
  await assertClubExiste(sql, clubId);

  const { createClerkClient } = await import("@clerk/backend");
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

  // --- Usuarios -------------------------------------------------------------
  const usuarios = await todas((p) => clerk.users.getUserList(p));
  const existentes = new Set(
    (await sql.query('SELECT "user_id" FROM "membresias" WHERE "club_id" = $1', [clubId])).map((r) => r.user_id)
  );

  let creadas = 0;
  const yaExistian = [];
  const salteados = [];
  const admins = [];

  for (const u of usuarios) {
    const m = meta(u);
    const rol = m.role;
    const email = emailDe(u);
    if (!ROLES.includes(rol)) {
      salteados.push({ id: u.id, email, motivo: rol ? `rol desconocido "${rol}"` : "sin rol" });
      continue;
    }
    if (rol === "admin") admins.push({ id: u.id, email, activo: !u.banned });
    if (existentes.has(u.id)) {
      yaExistian.push(u.id);
      continue;
    }

    const fila = { rol, lugarRetiro: lugarDe(m), activo: !u.banned };
    if (dryRun) {
      console.log(`  + ${u.id} ${email} → ${fila.rol}${fila.lugarRetiro ? ` (${fila.lugarRetiro})` : ""}${fila.activo ? "" : " [INACTIVO]"}`);
      creadas++;
      continue;
    }
    const insertadas = await sql.query(
      `INSERT INTO "membresias" ("id", "user_id", "club_id", "rol", "lugar_retiro", "activo", "updated_at")
       VALUES ($1, $2, $3, $4::"AppRole", $5::"LugarRetiro", $6, NOW())
       ON CONFLICT ("user_id", "club_id") DO NOTHING
       RETURNING "id"`,
      [randomUUID(), u.id, clubId, fila.rol, fila.lugarRetiro, fila.activo]
    );
    creadas += insertadas.length;
  }

  // --- Invitaciones pendientes ---------------------------------------------
  const invitaciones = await todas((p) => clerk.invitations.getInvitationList({ ...p, status: "pending" }));
  let importadas = 0;
  const invSalteadas = [];

  for (const inv of invitaciones) {
    const m = meta(inv);
    if (!ROLES.includes(m.role)) {
      invSalteadas.push({ id: inv.id, email: inv.emailAddress, motivo: m.role ? `rol desconocido "${m.role}"` : "sin rol" });
      continue;
    }
    const expira = new Date(inv.expiresAt ?? Date.now() + VENCIMIENTO_DEFAULT_MS);
    const tokenHash = createHash("sha256").update(randomBytes(32)).digest("hex");
    const params = [
      randomUUID(), clubId, inv.emailAddress.toLowerCase(), String(m.firstName ?? ""), String(m.lastName ?? ""),
      m.role, lugarDe(m), tokenHash, inv.id, "migracion-clerk", expira,
    ];
    if (dryRun) {
      const ya = await sql.query('SELECT 1 FROM "invitaciones" WHERE "clerk_invitation_id" = $1', [inv.id]);
      if (ya.length === 0) {
        console.log(`  + invitación ${inv.id} ${inv.emailAddress} → ${m.role}`);
        importadas++;
      }
      continue;
    }
    const insertadas = await sql.query(
      `INSERT INTO "invitaciones"
         ("id", "club_id", "email", "nombre", "apellido", "rol", "lugar_retiro", "token_hash",
          "clerk_invitation_id", "invitado_por", "expira", "updated_at")
       SELECT $1, $2, $3, $4, $5, $6::"AppRole", $7::"LugarRetiro", $8, $9, $10, $11, NOW()
       WHERE NOT EXISTS (SELECT 1 FROM "invitaciones" WHERE "clerk_invitation_id" = $9)
       RETURNING "id"`,
      params
    );
    importadas += insertadas.length;
  }

  // --- Reporte --------------------------------------------------------------
  const linea = (etiqueta, valor) => console.log(`${`${etiqueta}:`.padEnd(30)}${valor}`);
  console.log();
  linea("Usuarios en Clerk", usuarios.length);
  linea(dryRun ? "Membresías a crear" : "Membresías creadas", creadas);
  linea("Membresías que ya existían", yaExistian.length);
  linea("Usuarios salteados", salteados.length);
  for (const s of salteados) console.log(`  - ${s.id} ${s.email} (${s.motivo})`);
  linea("Invitaciones pendientes", invitaciones.length);
  linea(dryRun ? "Invitaciones a importar" : "Invitaciones importadas", importadas);
  for (const s of invSalteadas) console.log(`  - ${s.id} ${s.email} (${s.motivo})`);
  console.log(`\nAdmins (candidatos a superadmin con scripts/add-superadmin.mjs):`);
  for (const a of admins) console.log(`  ${a.id}  ${a.email}${a.activo ? "" : "  [deshabilitado]"}`);
  console.log(dryRun ? "\n✓ Dry run completo, no se escribió nada." : "\n✓ Migración completa.");
}

main().catch((err) => {
  console.error("Migración fallida:", err);
  process.exit(1);
});
