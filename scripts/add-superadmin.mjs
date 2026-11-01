#!/usr/bin/env node
/**
 * Da de alta a un usuario de Clerk como superadmin de BioTeam: puede crear
 * clubes y entrar a cualquiera. No es un rol de club: no le da membresías.
 *
 * Verifica en Clerk que el usuario exista antes de escribir (un id mal copiado
 * no da error en la base, porque superadmins no tiene FK a Clerk).
 *
 * Usage: node scripts/add-superadmin.mjs <clerkUserId>
 */
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const userId = process.argv[2];
if (!userId || !userId.startsWith("user_")) {
  console.error("Usage: node scripts/add-superadmin.mjs <clerkUserId>   (ej. user_2abc...)");
  process.exit(1);
}

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

async function main() {
  const { createClerkClient } = await import("@clerk/backend");
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

  let user;
  try {
    user = await clerk.users.getUser(userId);
  } catch {
    console.error(`No existe el usuario ${userId} en Clerk.`);
    process.exit(1);
  }

  const insertados = await sql.query(
    'INSERT INTO "superadmins" ("user_id") VALUES ($1) ON CONFLICT ("user_id") DO NOTHING RETURNING "user_id"',
    [userId]
  );
  const email = user.emailAddresses?.[0]?.emailAddress ?? "";
  console.log(
    insertados.length > 0
      ? `✓ ${userId} (${email}) ahora es superadmin.`
      : `~ ${userId} (${email}) ya era superadmin.`
  );
}

main().catch((err) => {
  console.error("Falló:", err);
  process.exit(1);
});
