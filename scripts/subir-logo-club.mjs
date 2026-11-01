#!/usr/bin/env node
/**
 * Sube el logo de un club a S3 (`clubes/<clubId>/logo.<ext>`) y lo asocia en
 * `clubes`: `logo_key` (la key de S3) y `logo_url` (un path público de
 * respaldo mientras la UI no genere URLs prefirmadas).
 *
 * Por defecto sube el escudo de Gimnasia (`public/logo.png`) a su club.
 *
 * Usa las mismas variables S3_* que lib/s3.ts. Sin ellas no sube: con
 * `--solo-url` setea solo `logo_url` y deja `logo_key` como está.
 *
 * Usage: node scripts/subir-logo-club.mjs [--club <id>] [--file <path>] [--url <path público>] [--solo-url]
 */
import { readFileSync } from "fs";
import path from "path";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { getClubId, assertClubExiste } from "./club-arg.mjs";

config({ path: ".env.local", quiet: true });

const TIPOS = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml" };

function arg(nombre, porDefecto) {
  const i = process.argv.indexOf(nombre);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : porDefecto;
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}
const sql = neon(url);

async function main() {
  const clubId = getClubId();
  const archivo = arg("--file", "public/logo.png");
  const logoUrl = arg("--url", "/logo.png");
  const soloUrl = process.argv.includes("--solo-url");
  await assertClubExiste(sql, clubId);

  if (soloUrl) {
    await sql.query('UPDATE "clubes" SET "logo_url" = $1, "updated_at" = NOW() WHERE "id" = $2', [logoUrl, clubId]);
    console.log(`✓ logo_url = ${logoUrl} (sin subir a S3; logo_key no se tocó)`);
    return;
  }

  const { S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;
  if (!S3_REGION || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    console.error("Faltan variables S3_* en .env.local. Para setear solo logo_url, correr con --solo-url.");
    process.exit(1);
  }

  const ext = path.extname(archivo).toLowerCase();
  const contentType = TIPOS[ext];
  if (!contentType) {
    console.error(`Extensión no soportada: ${ext}`);
    process.exit(1);
  }
  const key = `clubes/${clubId}/logo${ext === ".jpeg" ? ".jpg" : ext}`;

  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const s3 = new S3Client({
    region: S3_REGION,
    credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
  });
  await s3.send(
    new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: readFileSync(archivo), ContentType: contentType })
  );
  console.log(`  ✓ subido ${archivo} → s3://${S3_BUCKET}/${key}`);

  await sql.query(
    'UPDATE "clubes" SET "logo_key" = $1, "logo_url" = $2, "updated_at" = NOW() WHERE "id" = $3',
    [key, logoUrl, clubId]
  );
  console.log(`✓ logo_key = ${key}, logo_url = ${logoUrl}`);
}

main().catch((err) => {
  console.error("Falló:", err);
  process.exit(1);
});
