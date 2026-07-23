#!/usr/bin/env node
/**
 * Seeds random turnos (citas) para CADA deportista existente (3 a 5 c/u).
 *
 * Para cada deportista se generan entre 3 y 5 turnos. Cada turno se vincula a
 * ESE deportista con una fila en `turno_deportistas` (1 turno ↔ 1 deportista),
 * lo que garantiza exactamente 3–5 turnos por deportista.
 *
 * Para cada turno:
 *   - Elige un profesional del pool de roles de salud (HEALTH_ROLES) traído en
 *     runtime desde Clerk (@clerk/backend) — NO se hardcodean IDs.
 *   - Deriva título y lugar coherentes con el rol del profesional asignado.
 *   - fecha: mezcla de pasado (~6 meses atrás) y futuro (~3 meses adelante);
 *     ~45% de los turnos quedan en el futuro (son citas).
 *   - hora: string "HH:MM" realista en horario de atención (08:00–20:00).
 *
 * Roles que pueden crear turnos (de lib/actions/turnos.ts):
 *   HEALTH_ROLES = medico, kinesiologo, nutricionista, psicologo, cardiologo.
 * Los roles `social` y `admin` NO entran al pool. Si el pool queda vacío, aborta.
 *
 * Uses Neon's HTTP driver (avoids the TCP/IPv6 issue like apply-migration.mjs).
 * NO recrea deportistas: los lee de la DB.
 *
 * ⚠️  IDEMPOTENCIA: Al inicio ejecuta `DELETE FROM "turnos"`, que borra en
 * cascada `turno_deportistas`. Re-correr no duplica. Corré esto sólo en
 * entornos de prueba.
 *
 * Requiere CLERK_SECRET_KEY en .env.local.
 *
 * Usage: node scripts/seed-turnos.mjs
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
if (!process.env.CLERK_SECRET_KEY) {
  console.error("CLERK_SECRET_KEY not set (necesario para traer profesionales)");
  process.exit(1);
}
const sql = neon(url);

// --- Helpers aleatorios -----------------------------------------------------
function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function chance(p) {
  return Math.random() < p;
}
// Fecha aleatoria en los últimos `meses` (pasado, hasta hoy).
function fechaPasada(meses) {
  const ahora = Date.now();
  const rango = meses * 30 * 24 * 60 * 60 * 1000;
  return new Date(ahora - Math.floor(Math.random() * rango));
}
// Fecha aleatoria futura en los próximos `dias`.
function fechaFutura(dias) {
  const ahora = Date.now();
  const rango = dias * 24 * 60 * 60 * 1000;
  return new Date(ahora + Math.floor(Math.random() * rango));
}
// Hora "HH:MM" en horario de atención (08:00–20:00, minutos 00/15/30/45).
function horaAtencion() {
  const hh = String(randInt(8, 19)).padStart(2, "0");
  const mm = rand(["00", "15", "30", "45"]);
  return `${hh}:${mm}`;
}

// --- Multi-row parameterized insert helper ----------------------------------
async function insertRows(table, columns, rows) {
  if (rows.length === 0) return;
  const colList = columns.map((c) => `"${c}"`).join(", ");
  const params = [];
  const tuples = rows.map((row) => {
    const placeholders = columns.map((_, i) => `$${params.length + i + 1}`);
    params.push(...columns.map((c) => row[c]));
    return `(${placeholders.join(", ")})`;
  });
  await sql.query(
    `INSERT INTO "${table}" (${colList}) VALUES ${tuples.join(", ")}`,
    params
  );
}

const chunkSize = 30;
async function insertAll(table, columns, rows) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    await insertRows(table, columns, rows.slice(i, i + chunkSize));
  }
}

// --- Catálogos por rol ------------------------------------------------------
// Cada rol de salud tiene títulos y lugares coherentes; se elige primero el
// profesional (y con él su rol) y luego un título/lugar acorde.
const catalogoPorRol = {
  medico: {
    titulos: [
      "Control médico", "Revisión clínica", "Apto médico deportivo",
      "Examen clínico anual", "Consulta médica", "Seguimiento clínico",
    ],
    lugares: ["Consultorio médico", "Sala de atención médica", "Consultorio del club"],
    descripciones: [
      "Control clínico de rutina previo a la competencia.",
      "Revisión de signos vitales y estado general.",
      "Consulta por molestias leves reportadas en el último entrenamiento.",
      "Renovación del apto médico deportivo.",
    ],
  },
  kinesiologo: {
    titulos: [
      "Sesión de kinesiología", "Rehabilitación kinésica", "Control de movilidad",
      "Kinesiología preventiva", "Tratamiento de recuperación",
    ],
    lugares: ["Sala de kinesiología", "Gimnasio del club", "Sala de rehabilitación"],
    descripciones: [
      "Sesión de fortalecimiento y trabajo propioceptivo.",
      "Rehabilitación post-lesión de miembro inferior.",
      "Trabajo de movilidad articular y elongación.",
      "Kinesiología preventiva de rutina.",
    ],
  },
  nutricionista: {
    titulos: [
      "Evaluación nutricional", "Control de composición corporal", "Consulta de nutrición",
      "Seguimiento nutricional", "Ajuste de plan alimentario",
    ],
    lugares: ["Consultorio de nutrición", "Consultorio del club"],
    descripciones: [
      "Evaluación de composición corporal y ajuste del plan.",
      "Control de peso y perímetros en fase de pretemporada.",
      "Consulta para revisar el plan alimentario actual.",
      "Seguimiento nutricional de rutina.",
    ],
  },
  psicologo: {
    titulos: [
      "Consulta psicológica", "Evaluación psicológica", "Seguimiento psicológico",
      "Sesión de acompañamiento", "Control psicológico deportivo",
    ],
    lugares: ["Consultorio psicológico", "Consultorio del club", "Sala de reuniones"],
    descripciones: [
      "Sesión de acompañamiento y manejo del estrés competitivo.",
      "Evaluación del estado anímico y la motivación.",
      "Trabajo de técnicas de concentración y visualización.",
      "Seguimiento psicológico mensual.",
    ],
  },
  cardiologo: {
    titulos: [
      "Evaluación cardiológica", "Control cardiológico", "Apto cardiológico deportivo",
      "Revisión cardiovascular", "ECG y examen físico",
    ],
    lugares: ["Consultorio cardiológico", "Consultorio médico", "Sala de estudios"],
    descripciones: [
      "Electrocardiograma y examen cardiovascular de rutina.",
      "Control cardiológico para práctica de alto rendimiento.",
      "Revisión de estudios previos y auscultación.",
      "Apto cardiológico anual.",
    ],
  },
};

// Fallback genérico si un rol no tuviera catálogo (no debería ocurrir).
const catalogoGenerico = {
  titulos: ["Turno", "Control", "Consulta", "Seguimiento"],
  lugares: ["Consultorio del club", "Cancha principal", "Gimnasio del club"],
  descripciones: [
    "Turno de control programado.",
    "Consulta de seguimiento habitual.",
  ],
};

const HEALTH_ROLES = ["medico", "kinesiologo", "nutricionista", "psicologo", "cardiologo"];

async function fetchProfesionalesPorRol() {
  const { createClerkClient } = await import("@clerk/backend");
  const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  const res = await client.users.getUserList({ limit: 100 });
  const porRol = {};
  for (const user of res.data ?? []) {
    const role = String(user.publicMetadata?.role ?? "");
    if (!role) continue;
    (porRol[role] ??= []).push(user.id);
  }
  return porRol;
}

async function main() {
  console.log("Seeding turnos aleatorios (datos de prueba)...");

  // 1. Traer profesionales desde Clerk y armar el pool de salud (id + rol).
  const porRol = await fetchProfesionalesPorRol();
  const conteoRoles = Object.fromEntries(
    Object.entries(porRol).map(([r, ids]) => [r, ids.length])
  );
  console.log("  ✓ Profesionales por rol (Clerk):", JSON.stringify(conteoRoles));

  // Pool: cada entrada guarda { id, rol } para elegir título/lugar coherente.
  const pool = HEALTH_ROLES.flatMap((rol) => (porRol[rol] ?? []).map((id) => ({ id, rol })));
  if (pool.length === 0) {
    console.error(
      "No hay ningún profesional de salud elegible en Clerk (roles: " +
        HEALTH_ROLES.join(", ") +
        "). Abortando."
    );
    process.exit(1);
  }
  console.log(`  ✓ Pool de profesionales de salud: ${pool.length}`);

  // 2. Leer deportistas.
  const deportistas = await sql.query('SELECT id FROM "deportistas"');
  if (deportistas.length === 0) {
    console.error("No hay deportistas. Corré primero: npm run seed:deportistas");
    process.exit(1);
  }
  console.log(`  ✓ ${deportistas.length} deportistas encontrados`);

  // 3. Limpiar (idempotencia). turnos borra en cascada turno_deportistas.
  await sql.query('DELETE FROM "turnos"');
  console.log("  ✓ turnos limpiados (cascade sobre turno_deportistas)");

  // 4. Generar filas.
  const turnoRows = [];
  const turnoDeportistaRows = [];

  for (const dep of deportistas) {
    const cantidad = randInt(3, 5);
    for (let i = 0; i < cantidad; i++) {
      const prof = rand(pool);
      const cat = catalogoPorRol[prof.rol] ?? catalogoGenerico;
      const turnoId = randomUUID();
      // ~45% de los turnos son futuros (citas próximas), el resto pasados.
      const fecha = chance(0.45) ? fechaFutura(90) : fechaPasada(6);
      // created_at/updated_at: @updatedAt no tiene default a nivel DB, así que
      // en un INSERT crudo hay que setearlos explícitamente.
      const now = new Date();

      turnoRows.push({
        id: turnoId,
        titulo: rand(cat.titulos),
        fecha,
        hora: horaAtencion(),
        lugar: rand(cat.lugares),
        descripcion: chance(0.4) ? rand(cat.descripciones) : null,
        profesional_id: prof.id,
        created_at: now,
        updated_at: now,
      });

      turnoDeportistaRows.push({
        id: randomUUID(),
        turno_id: turnoId,
        deportista_id: dep.id,
      });
    }
  }

  // 5. Insertar en chunks. Primero turnos (FK padre), luego turno_deportistas.
  await insertAll(
    "turnos",
    [
      "id", "titulo", "fecha", "hora", "lugar", "descripcion",
      "profesional_id", "created_at", "updated_at",
    ],
    turnoRows
  );
  console.log(`  ✓ ${turnoRows.length} filas en turnos`);

  await insertAll(
    "turno_deportistas",
    ["id", "turno_id", "deportista_id"],
    turnoDeportistaRows
  );
  console.log(`  ✓ ${turnoDeportistaRows.length} filas en turno_deportistas`);

  // 6. Conteos reales desde la DB.
  const [{ total_turnos }] = await sql.query('SELECT COUNT(*)::int AS total_turnos FROM "turnos"');
  const [{ total_td }] = await sql.query('SELECT COUNT(*)::int AS total_td FROM "turno_deportistas"');
  const [{ min_por_dep, max_por_dep, prom_por_dep }] = await sql.query(
    `SELECT MIN(c)::int AS min_por_dep, MAX(c)::int AS max_por_dep,
            ROUND(AVG(c), 2)::float8 AS prom_por_dep
       FROM (SELECT COUNT(*) AS c FROM "turno_deportistas" GROUP BY deportista_id) t`
  );
  const [{ fuera_de_rango }] = await sql.query(
    `SELECT COUNT(*)::int AS fuera_de_rango
       FROM (SELECT COUNT(*) AS c FROM "turno_deportistas" GROUP BY deportista_id) t
      WHERE c < 3 OR c > 5`
  );
  const [{ sin_turnos }] = await sql.query(
    `SELECT COUNT(*)::int AS sin_turnos FROM "deportistas" d
      WHERE NOT EXISTS (SELECT 1 FROM "turno_deportistas" td WHERE td.deportista_id = d.id)`
  );

  console.log("\nConteos finales (desde la DB):");
  console.log(`  turnos                                 ${total_turnos}`);
  console.log(`  turno_deportistas                      ${total_td}`);
  console.log(`  total deportistas                      ${deportistas.length}`);
  console.log(`\n  turnos por deportista  min=${min_por_dep}  max=${max_por_dep}  prom=${prom_por_dep}`);
  console.log(`  deportistas fuera de rango [3,5]       ${fuera_de_rango} (debe ser 0)`);
  console.log(`  deportistas sin turnos                 ${sin_turnos} (debe ser 0)`);
  console.log("✓ Seed completado.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
