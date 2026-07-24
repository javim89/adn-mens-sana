#!/usr/bin/env node
/**
 * Seeds the satellite 1:1 models for every existing deportista:
 *   - datos_salud            (+ enfermedades_preexistentes, antecedentes_enfermedades_familiares 1:N)
 *   - datos_escolares        (coherente con la edad)
 *   - datos_sociales
 *
 * Uses Neon's HTTP driver (avoids the TCP/IPv6 issue like apply-migration.mjs).
 * NO recrea deportistas: los lee de la DB (deben estar sembrados con seed:deportistas).
 *
 * ⚠️  IDEMPOTENCIA: Al inicio ejecuta `DELETE FROM "datos_salud"` (cascade sobre
 * enfermedades_preexistentes y antecedentes_enfermedades_familiares),
 * `DELETE FROM "datos_escolares"` y `DELETE FROM "datos_sociales"`.
 * Re-correr no duplica. Corré esto sólo en entornos de prueba.
 *
 * Usage: node scripts/seed-datos-deportistas.mjs
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

// Edad en años cumplidos a partir de una fecha de nacimiento.
function edadDesde(fechaNacimiento) {
  const nac = new Date(fechaNacimiento);
  const hoy = new Date();
  let edad = hoy.getUTCFullYear() - nac.getUTCFullYear();
  const m = hoy.getUTCMonth() - nac.getUTCMonth();
  if (m < 0 || (m === 0 && hoy.getUTCDate() < nac.getUTCDate())) {
    edad--;
  }
  return edad;
}

// --- Multi-row parameterized insert helper (idéntico a seed-deportistas.mjs) -
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

// --- Catálogos --------------------------------------------------------------
// grupos sanguíneos ponderados (0+ y A+ más frecuentes)
const gruposSanguineos = [
  "0+", "0+", "0+", "0+", "A+", "A+", "A+", "B+", "AB+", "0-", "A-", "B-", "AB-",
];
const horasSuenio = ["6", "7", "7", "8", "8", "9"];
// obras sociales ponderadas (IOMA y Sin obra social frecuentes)
const obrasSociales = [
  "IOMA", "IOMA", "IOMA", "Sin obra social", "Sin obra social",
  "OSDE", "Swiss Medical", "PAMI", "OSECAC", "Medifé",
];
const antecedentesQuirurgicos = [
  "Apendicectomía 2021", "Cirugía de meniscos", "Amigdalectomía",
  "Osteosíntesis de tobillo",
];
const medicacionesCronicas = [
  "Salbutamol", "Levotiroxina", "Antihistamínico estacional",
];
const historialesLesiones = [
  "Esguince de tobillo 2023", "Desgarro isquiotibial", "Fractura de escafoides 2022",
];

// Enum EnfermedadPreexistente (prioriza ASMA, ALERGIAS, MIGRANA, COVID)
const enfermedadesPreexistentesPonderadas = [
  "ASMA", "ASMA", "ALERGIAS", "ALERGIAS", "ALERGIAS", "MIGRANA", "MIGRANA",
  "COVID", "COVID", "PRESION_ARTERIAL", "DIABETES", "CHAGAS", "EPILEPSIA", "ETS", "OTRO",
];
// Enum AntecedenteEnfermedadFamiliar
const antecedentesFamiliares = [
  "DIABETES", "EPOC", "DISLIPEMIAS", "HIPOTIROIDISMO", "HIPERTIROIDISMO", "ASMA",
  "CANCER", "CHAGAS", "MIGRANA", "HIPERTENSION_ARTERIAL", "CORONARIOPATIAS", "OTRO",
];

const colegiosLaPlata = [
  "Colegio Nacional Rafael Hernández", "EEST N°2", "Colegio San Cayetano",
  "Instituto San Luis", "EES N°5", "Liceo Víctor Mercante", "Colegio del Sol",
  "EES N°12", "Instituto San Vicente de Paul", "EEST N°6",
];
const materiasAdeudadas = [
  "Matemática", "Inglés, Historia", "Biología", "Física", "Lengua",
];

const conQuienVive = ["Padres", "Madre", "Padre", "Abuelos", "Pareja", "Solo/a", "Tutor"];
const composicionesFamiliares = [
  "Padre, madre y 2 hermanos", "Madre y 1 hermano", "Vive con abuelos",
  "Padre, madre y 1 hermana", "Vive solo/a", "Madre, padrastro y 1 hermano",
  "Padre, madre y 3 hermanos", "Con pareja",
];

async function main() {
  console.log("Seeding datos satélite de deportistas (datos de prueba)...");

  // 1. Leer deportistas.
  const deportistas = await sql.query('SELECT id, fecha_nacimiento FROM "deportistas"');
  if (deportistas.length === 0) {
    console.error("No hay deportistas. Corré primero: npm run seed:deportistas");
    process.exit(1);
  }
  console.log(`  ✓ ${deportistas.length} deportistas encontrados`);

  // 2. Limpiar (idempotencia). datos_salud borra en cascada sus hijos 1:N.
  await sql.query('DELETE FROM "datos_salud"');
  await sql.query('DELETE FROM "datos_escolares"');
  await sql.query('DELETE FROM "datos_sociales"');
  console.log("  ✓ datos_salud / datos_escolares / datos_sociales limpiados");

  // 3. Generar filas.
  const saludRows = [];
  const enfermedadesRows = [];
  const antecedentesRows = [];
  const escolaresRows = [];
  const socialesRows = [];

  for (const dep of deportistas) {
    const edad = edadDesde(dep.fecha_nacimiento);

    // --- datos_salud (1:1) ---
    const saludId = randomUUID();
    saludRows.push({
      id: saludId,
      deportista_id: dep.id,
      grupo_sanguineo: rand(gruposSanguineos),
      horas_suenio: rand(horasSuenio),
      obra_social: rand(obrasSociales),
      antecedente_muerte_subita_familiar: chance(0.05),
      antecedentes_quirurgicos: chance(0.18) ? rand(antecedentesQuirurgicos) : null,
      medicacion_cronica: chance(0.12) ? rand(medicacionesCronicas) : null,
      historial_lesiones: chance(0.2) ? rand(historialesLesiones) : null,
    });

    // --- enfermedades_preexistentes (1:N, ~30%) ---
    if (chance(0.3)) {
      const usadas = new Set();
      const cantidad = randInt(1, 2);
      for (let k = 0; k < cantidad; k++) {
        const enfermedad = rand(enfermedadesPreexistentesPonderadas);
        if (usadas.has(enfermedad)) continue;
        usadas.add(enfermedad);
        enfermedadesRows.push({
          id: randomUUID(),
          datos_salud_id: saludId,
          enfermedad,
        });
      }
    }

    // --- antecedentes_enfermedades_familiares (1:N, ~30%) ---
    if (chance(0.3)) {
      const usados = new Set();
      const cantidad = randInt(1, 2);
      for (let k = 0; k < cantidad; k++) {
        const antecedente = rand(antecedentesFamiliares);
        if (usados.has(antecedente)) continue;
        usados.add(antecedente);
        antecedentesRows.push({
          id: randomUUID(),
          datos_salud_id: saludId,
          antecedente,
        });
      }
    }

    // --- datos_escolares (1:1, coherente con la edad) ---
    let nivelEstudio;
    let anoCursa = null;
    if (edad < 12) {
      nivelEstudio = "PRIMARIO_EN_CURSO";
      anoCursa = randInt(1, 6);
    } else if (edad <= 17) {
      nivelEstudio = "SECUNDARIO_EN_CURSO";
      anoCursa = randInt(1, 6);
    } else if (edad <= 22) {
      if (chance(0.5)) {
        nivelEstudio = "SECUNDARIO_COMPLETO";
        anoCursa = null;
      } else {
        nivelEstudio = "TERCIARIO_EN_CURSO";
        anoCursa = randInt(1, 3);
      }
    } else {
      const opcion = rand(["SECUNDARIO_COMPLETO", "TERCIARIO_COMPLETO", "TERCIARIO_EN_CURSO"]);
      nivelEstudio = opcion;
      anoCursa = opcion === "TERCIARIO_EN_CURSO" ? randInt(1, 3) : null;
    }
    const enCurso = nivelEstudio.endsWith("EN_CURSO");
    escolaresRows.push({
      id: randomUUID(),
      deportista_id: dep.id,
      nivel_estudio: nivelEstudio,
      nombre_colegio: enCurso ? rand(colegiosLaPlata) : (chance(0.4) ? rand(colegiosLaPlata) : null),
      ano_cursa: anoCursa,
      materias_adeudadas: enCurso
        ? (chance(0.25) ? rand(materiasAdeudadas) : (chance(0.5) ? "Ninguna" : null))
        : null,
    });

    // --- datos_sociales (1:1) ---
    const trabaja = edad >= 18 ? chance(0.35) : chance(0.03);
    const conQuien = edad < 18
      ? (chance(0.75) ? "Padres" : rand(conQuienVive))
      : rand(conQuienVive);
    socialesRows.push({
      id: randomUUID(),
      deportista_id: dep.id,
      trabaja,
      situacion_laboral_hogar: rand([
        "ALGUIEN_TRABAJA", "ALGUIEN_TRABAJA", "ALGUIEN_TRABAJA", "ALGUIEN_TRABAJA",
        "NADIE_TRABAJA", "SIN_DATO",
      ]),
      con_quien_vive: conQuien,
      composicion_grupo_familiar: rand(composicionesFamiliares),
    });
  }

  // 4. Insertar en chunks de ~30.
  const chunkSize = 30;

  async function insertAll(table, columns, rows) {
    for (let i = 0; i < rows.length; i += chunkSize) {
      await insertRows(table, columns, rows.slice(i, i + chunkSize));
    }
  }

  await insertAll(
    "datos_salud",
    [
      "id", "deportista_id", "grupo_sanguineo", "horas_suenio", "obra_social",
      "antecedente_muerte_subita_familiar", "antecedentes_quirurgicos",
      "medicacion_cronica", "historial_lesiones",
    ],
    saludRows
  );
  console.log(`  ✓ ${saludRows.length} filas en datos_salud`);

  await insertAll(
    "enfermedades_preexistentes",
    ["id", "datos_salud_id", "enfermedad"],
    enfermedadesRows
  );
  console.log(`  ✓ ${enfermedadesRows.length} filas en enfermedades_preexistentes`);

  await insertAll(
    "antecedentes_enfermedades_familiares",
    ["id", "datos_salud_id", "antecedente"],
    antecedentesRows
  );
  console.log(`  ✓ ${antecedentesRows.length} filas en antecedentes_enfermedades_familiares`);

  await insertAll(
    "datos_escolares",
    ["id", "deportista_id", "nivel_estudio", "nombre_colegio", "ano_cursa", "materias_adeudadas"],
    escolaresRows
  );
  console.log(`  ✓ ${escolaresRows.length} filas en datos_escolares`);

  await insertAll(
    "datos_sociales",
    ["id", "deportista_id", "trabaja", "situacion_laboral_hogar", "con_quien_vive", "composicion_grupo_familiar"],
    socialesRows
  );
  console.log(`  ✓ ${socialesRows.length} filas en datos_sociales`);

  // 5. Conteos reales desde la DB.
  const [{ salud }] = await sql.query('SELECT COUNT(*)::int AS salud FROM "datos_salud"');
  const [{ escolares }] = await sql.query('SELECT COUNT(*)::int AS escolares FROM "datos_escolares"');
  const [{ sociales }] = await sql.query('SELECT COUNT(*)::int AS sociales FROM "datos_sociales"');
  const [{ enfermedades }] = await sql.query('SELECT COUNT(*)::int AS enfermedades FROM "enfermedades_preexistentes"');
  const [{ antecedentes }] = await sql.query('SELECT COUNT(*)::int AS antecedentes FROM "antecedentes_enfermedades_familiares"');

  console.log("\nConteos finales (desde la DB):");
  console.log(`  datos_salud                          ${salud}`);
  console.log(`  datos_escolares                      ${escolares}`);
  console.log(`  datos_sociales                       ${sociales}`);
  console.log(`  enfermedades_preexistentes           ${enfermedades}`);
  console.log(`  antecedentes_enfermedades_familiares ${antecedentes}`);
  console.log(`\nTotal deportistas: ${deportistas.length}`);
  console.log("✓ Seed completado.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
