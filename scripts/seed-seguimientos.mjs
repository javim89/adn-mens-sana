#!/usr/bin/env node
/**
 * Seeds random seguimientos for EVERY existing deportista (min. 10 each, 10-14).
 *
 * Para cada seguimiento:
 *   - Elige un tipo (TipoSeguimiento) con una distribución ponderada.
 *   - Asigna un profesional_id (un userId de Clerk) del pool elegible para ese
 *     tipo, según el rol de publicMetadata.role. Los profesionales se traen en
 *     runtime desde Clerk (@clerk/backend) — NO se hardcodean IDs.
 *   - Crea la fila satélite 1:1 correspondiente al tipo (para GENERICO no se
 *     crea satélite).
 *
 * Mapa tipo -> roles elegibles:
 *   GENERICO               -> cualquier rol de salud + admin
 *   TRAUMATOLOGIA          -> medico
 *   HISTORIA_CLINICA       -> medico
 *   EVALUACION_PSICOLOGICA -> psicologo
 *   EVALUACION_CARDIOLOGICA-> cardiologo (fallback: medico)
 *   ANTROPOMETRIA          -> nutricionista
 * Si un pool queda vacío tras el fallback, ese tipo se omite (no rompe).
 *
 * Uses Neon's HTTP driver (avoids the TCP/IPv6 issue like apply-migration.mjs).
 * NO recrea deportistas: los lee de la DB.
 *
 * ⚠️  IDEMPOTENCIA: Al inicio ejecuta `DELETE FROM "seguimientos"`, que borra en
 * cascada todas las tablas satélite. Re-correr no duplica. Corré esto sólo en
 * entornos de prueba.
 *
 * Requiere CLERK_SECRET_KEY en .env.local.
 *
 * Usage: node scripts/seed-seguimientos.mjs
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
function randFloat(min, max, decimals = 1) {
  const f = 10 ** decimals;
  return Math.round((Math.random() * (max - min) + min) * f) / f;
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

// --- Cálculo antropométrico (mismo criterio que lib/utils/antropometria.ts) --
// talla en cm; imc = peso / (talla_m^2); sumatoria = suma de los 6 pliegues.
function computeAntropometria(peso, tallaCm, pliegues) {
  const tallaM = tallaCm / 100;
  const imc = Math.round((peso / (tallaM * tallaM)) * 10) / 10;
  const sumatoria = Math.round(pliegues.reduce((a, n) => a + n, 0) * 10) / 10;
  return { imc, sumatoriaPliegues: sumatoria };
}

// --- Catálogos por tipo -----------------------------------------------------
// Distribución de tipos ponderada (GENERICO frecuente).
const tiposPonderados = [
  "GENERICO", "GENERICO", "GENERICO", "GENERICO", "GENERICO",
  "TRAUMATOLOGIA", "TRAUMATOLOGIA",
  "HISTORIA_CLINICA", "HISTORIA_CLINICA",
  "EVALUACION_PSICOLOGICA", "EVALUACION_PSICOLOGICA",
  "EVALUACION_CARDIOLOGICA",
  "ANTROPOMETRIA", "ANTROPOMETRIA",
];

// prioridad ponderada
const prioridadesPonderadas = [
  "MEDIA", "MEDIA", "MEDIA", "MEDIA", "MEDIA",
  "BAJA", "BAJA", "BAJA",
  "ALTA", "ALTA",
  "URGENTE",
];

const alertasPosibles = [
  "Requiere control en 7 días",
  "Derivar a especialista",
  "No apto para competencia hasta reevaluación",
  "Seguir de cerca la evolución",
  "Reforzar hidratación y descanso",
];

const catalogos = {
  GENERICO: {
    titulos: [
      "Control general", "Consulta de seguimiento", "Evaluación periódica",
      "Control post-entrenamiento", "Chequeo general", "Revisión de estado físico",
    ],
    descripciones: [
      "El deportista se presenta en buen estado general, sin molestias reportadas.",
      "Se realiza control de rutina. Refiere buena adaptación a la carga de entrenamiento.",
      "Consulta por seguimiento habitual. Sin novedades relevantes.",
      "Evaluación general dentro de parámetros esperados para su categoría.",
      "El deportista refiere cansancio leve tras la última semana de carga.",
    ],
    recomendaciones: [
      "Mantener rutina actual de entrenamiento.",
      "Incrementar horas de descanso.",
      "Continuar con plan de hidratación.",
      "Reevaluar en el próximo control.",
      "Sostener carga progresiva sin sobreexigir.",
    ],
    resultados: [
      "Estado general óptimo.",
      "Sin hallazgos patológicos.",
      "Evolución favorable.",
      "Parámetros dentro de lo esperado.",
    ],
  },
  TRAUMATOLOGIA: {
    titulos: [
      "Evaluación traumatológica", "Control articular", "Revisión de movilidad",
      "Chequeo osteoarticular", "Evaluación de estabilidad",
    ],
    descripciones: [
      "Se evalúa movilidad y estabilidad articular general.",
      "El deportista refiere leve molestia en tobillo tras torsión reciente.",
      "Control de rutina del aparato locomotor. Sin dolor referido.",
      "Evaluación postural y de simetría de miembros inferiores.",
      "Se revisa laxitud ligamentaria y rango de movimiento.",
    ],
    recomendaciones: [
      "Trabajo de fortalecimiento de core y estabilizadores.",
      "Ejercicios de propiocepción para tobillo.",
      "Elongación diaria de cadena posterior.",
      "Evitar cargas de impacto por 10 días.",
      "Iniciar kinesiología preventiva.",
    ],
    resultados: [
      "Rango articular conservado, sin signos de inestabilidad.",
      "Leve limitación de movilidad en tobillo derecho.",
      "Simetría de miembros inferiores adecuada.",
      "Postura dentro de parámetros normales.",
    ],
  },
  HISTORIA_CLINICA: {
    titulos: [
      "Historia clínica", "Examen clínico anual", "Apto médico deportivo",
      "Revisión clínica general", "Control clínico",
    ],
    descripciones: [
      "Se completa historia clínica y examen físico general.",
      "Examen anual para renovación del apto médico deportivo.",
      "Control clínico de rutina. Signos vitales dentro de rango.",
      "Se registra tensión arterial y auscultación cardiopulmonar.",
      "Evaluación de agudeza visual y estado general.",
    ],
    recomendaciones: [
      "Repetir laboratorio en 6 meses.",
      "Control oftalmológico anual.",
      "Sostener hábitos saludables.",
      "Renovar apto médico en 12 meses.",
      "Sin restricciones para la práctica deportiva.",
    ],
    resultados: [
      "Apto para la práctica deportiva.",
      "Examen físico sin particularidades.",
      "Signos vitales normales.",
      "Agudeza visual conservada.",
    ],
  },
  EVALUACION_PSICOLOGICA: {
    titulos: [
      "Evaluación psicológica", "Control psicológico deportivo", "Perfil psicológico",
      "Seguimiento psicológico", "Evaluación de habilidades mentales",
    ],
    descripciones: [
      "Se administran cuestionarios CPRD y STAI para perfil psicodeportivo.",
      "Evaluación de manejo del estrés y motivación de cara a la competencia.",
      "Seguimiento del estado anímico y la cohesión con el equipo.",
      "El deportista refiere ansiedad previa a partidos importantes.",
      "Evaluación de habilidad mental y control atencional.",
    ],
    recomendaciones: [
      "Trabajar técnicas de respiración y visualización.",
      "Sesiones semanales de acompañamiento psicológico.",
      "Reforzar rutinas pre-competitivas.",
      "Fortalecer la comunicación dentro del equipo.",
      "Continuar seguimiento mensual.",
    ],
    resultados: [
      "Buen nivel de motivación y control del estrés.",
      "Ansiedad estado elevada en contextos competitivos.",
      "Cohesión de equipo adecuada.",
      "Habilidad mental dentro de valores esperados.",
    ],
  },
  EVALUACION_CARDIOLOGICA: {
    titulos: [
      "Evaluación cardiológica", "Control cardiológico", "ECG y examen físico",
      "Apto cardiológico deportivo", "Revisión cardiovascular",
    ],
    descripciones: [
      "Se realiza electrocardiograma y examen físico cardiovascular.",
      "Control cardiológico de rutina para práctica deportiva de alto rendimiento.",
      "Evaluación por antecedentes familiares. Sin síntomas actuales.",
      "Se revisan estudios previos y se realiza auscultación.",
      "El deportista niega palpitaciones, síncope o dolor precordial.",
    ],
    recomendaciones: [
      "Sin restricciones para la actividad deportiva.",
      "Repetir ECG en 12 meses.",
      "Ampliar estudios con ecocardiograma.",
      "Control anual por cardiología.",
      "Continuar actividad con seguimiento periódico.",
    ],
    resultados: [
      "ECG dentro de parámetros normales.",
      "Examen cardiovascular sin hallazgos.",
      "Apto cardiológico para la práctica deportiva.",
      "Sin signos de patología estructural.",
    ],
  },
  ANTROPOMETRIA: {
    titulos: [
      "Evaluación antropométrica", "Control de composición corporal", "Antropometría",
      "Medición de pliegues y perímetros", "Seguimiento nutricional",
    ],
    descripciones: [
      "Se realiza medición antropométrica completa (pliegues y perímetros).",
      "Control de composición corporal en fase de pretemporada.",
      "Evaluación de peso, talla y sumatoria de pliegues.",
      "Seguimiento nutricional con control de perímetros musculares.",
      "Medición de rutina para ajuste del plan alimentario.",
    ],
    recomendaciones: [
      "Ajustar ingesta calórica según objetivo de composición.",
      "Incrementar aporte proteico en fase de fuerza.",
      "Mantener plan nutricional actual.",
      "Reevaluar composición corporal en 8 semanas.",
      "Reforzar hidratación durante entrenamientos.",
    ],
    resultados: [
      "Composición corporal adecuada para la disciplina.",
      "Sumatoria de pliegues dentro de valores esperados.",
      "Ligero descenso de masa grasa respecto al control previo.",
      "IMC en rango saludable.",
    ],
  },
};

// --- Valores para satélites -------------------------------------------------
const valEstabilidad = ["Normal", "Buena", "Leve inestabilidad", "Conservada", "Adecuada"];
const valMovilidad = ["Normal", "Completa", "Leve limitación", "Conservada", "Reducida"];
const valPostura = ["Normal", "Ligera hiperlordosis", "Sin alteraciones", "Escoliosis leve"];
const valLaxitud = ["Normal", "Leve", "No presenta", "Moderada"];
const valPodoscopia = ["Pie normal", "Pie plano leve", "Pie cavo leve", "Sin alteraciones"];
const valDiscrepancia = ["Sin discrepancia", "Discrepancia leve MID", "Simetría conservada"];

const valAuscultacion = ["Murmullo vesicular conservado", "Sin ruidos agregados", "Normal"];
const valTension = ["120/80", "110/70", "118/76", "125/82", "115/75"];
const valAgudeza = ["10/10", "9/10", "8/10", "10/10"];
const valDiagnosticoClinico = ["Sin patología aparente", "Apto sin restricciones", "Control normal", null];

const valSociograma = ["Buena integración grupal", "Rol de liderazgo", "Integración adecuada", null];
const valPoms = ["Perfil de estados de ánimo dentro de lo esperado", "Vigor elevado", "Sin alteraciones", null];

const valEcg = ["Ritmo sinusal normal", "Sin alteraciones", "Bradicardia sinusal fisiológica"];
const valExamenFisico = ["Normal", "Sin hallazgos", "Ruidos cardíacos normales"];
const valSintomas = ["Asintomático", "Niega síntomas", "Sin palpitaciones ni síncope"];
const valEstudiosAnteriores = ["Ecocardiograma normal (2024)", "Sin estudios previos", "ECG previo normal", null];
const valDiagnosticoCardio = ["Corazón sano", "Apto cardiológico", "Sin patología estructural"];
const valObs = ["Sin observaciones adicionales", "Continuar seguimiento", "Reevaluar próximo control", null];

// --- Constructores de satélite ----------------------------------------------
function buildTraumatologia(seguimientoId) {
  return {
    id: randomUUID(),
    seguimiento_id: seguimientoId,
    estabilidad_hombro: rand(valEstabilidad),
    estabilidad_rodilla: rand(valEstabilidad),
    estabilidad_tobillo: rand(valEstabilidad),
    movilidad_hombro: rand(valMovilidad),
    movilidad_cadera: rand(valMovilidad),
    movilidad_rodilla: rand(valMovilidad),
    movilidad_tobillo: rand(valMovilidad),
    discrepancia_asimetria: rand(valDiscrepancia),
    postura: rand(valPostura),
    laxitud: rand(valLaxitud),
    podoscopia: rand(valPodoscopia),
    observaciones: rand(valObs),
  };
}

function buildHistoriaClinica(seguimientoId) {
  return {
    id: randomUUID(),
    seguimiento_id: seguimientoId,
    tension_arterial: rand(valTension),
    auscultacion_pulmonar: rand(valAuscultacion),
    av_ojo_derecho: rand(valAgudeza),
    av_ojo_izquierdo: rand(valAgudeza),
    diagnostico: rand(valDiagnosticoClinico),
  };
}

function buildEvaluacionPsicologica(seguimientoId) {
  return {
    id: randomUUID(),
    seguimiento_id: seguimientoId,
    cprd_control_estres: randInt(0, 36),
    cprd_influencia_evaluacion: randInt(0, 36),
    cprd_motivacion: randInt(0, 36),
    cprd_habilidad_mental: randInt(0, 36),
    cprd_cohesion_equipo: randInt(0, 36),
    sociograma: rand(valSociograma),
    poms: rand(valPoms),
    stai_rasgo: randInt(0, 80),
    stai_estado: randInt(0, 80),
    observaciones: rand(valObs),
  };
}

function buildEvaluacionCardiologica(seguimientoId) {
  return {
    id: randomUUID(),
    seguimiento_id: seguimientoId,
    ecg: rand(valEcg),
    examen_fisico: rand(valExamenFisico),
    sintomas: rand(valSintomas),
    estudios_anteriores: rand(valEstudiosAnteriores),
    diagnostico: rand(valDiagnosticoCardio),
    observaciones: rand(valObs),
  };
}

function buildAntropometria(seguimientoId) {
  const peso = randFloat(55, 95, 1); // kg
  const tallaCm = randFloat(160, 195, 0); // cm
  const pliegueTriceps = randFloat(6, 18, 1);
  const pliegueSubescapular = randFloat(7, 20, 1);
  const pliegueSupraespinal = randFloat(5, 16, 1);
  const pliegueAbdominal = randFloat(8, 25, 1);
  const pliegueMuslo = randFloat(8, 22, 1);
  const plieguePantorrilla = randFloat(5, 15, 1);
  const { imc, sumatoriaPliegues } = computeAntropometria(peso, tallaCm, [
    pliegueTriceps, pliegueSubescapular, pliegueSupraespinal,
    pliegueAbdominal, pliegueMuslo, plieguePantorrilla,
  ]);
  return {
    id: randomUUID(),
    seguimiento_id: seguimientoId,
    peso,
    talla: tallaCm,
    tsen: randFloat(2, 8, 1),
    perimetro_brazo: randFloat(26, 38, 1),
    perimetro_muslo_medio: randFloat(48, 62, 1),
    perimetro_pantorrilla: randFloat(33, 42, 1),
    cintura_minima: randFloat(68, 88, 1),
    cadera_maxima: randFloat(88, 105, 1),
    pliegue_triceps: pliegueTriceps,
    pliegue_subescapular: pliegueSubescapular,
    pliegue_supraespinal: pliegueSupraespinal,
    pliegue_abdominal: pliegueAbdominal,
    pliegue_muslo: pliegueMuslo,
    pliegue_pantorrilla: plieguePantorrilla,
    imc,
    sumatoria_pliegues: sumatoriaPliegues,
  };
}

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
  console.log("Seeding seguimientos aleatorios (datos de prueba)...");

  // 1. Traer profesionales desde Clerk y armar pools por tipo.
  const porRol = await fetchProfesionalesPorRol();
  const conteoRoles = Object.fromEntries(
    Object.entries(porRol).map(([r, ids]) => [r, ids.length])
  );
  console.log("  ✓ Profesionales por rol (Clerk):", JSON.stringify(conteoRoles));

  const idsSalud = HEALTH_ROLES.flatMap((r) => porRol[r] ?? []);
  const idsAdmin = porRol.admin ?? [];

  const poolPorTipo = {
    GENERICO: [...idsSalud, ...idsAdmin],
    TRAUMATOLOGIA: porRol.medico ?? [],
    HISTORIA_CLINICA: porRol.medico ?? [],
    EVALUACION_PSICOLOGICA: porRol.psicologo ?? [],
    // fallback: si no hay cardiologo, un medico puede registrar la evaluación
    EVALUACION_CARDIOLOGICA: (porRol.cardiologo ?? []).length > 0
      ? porRol.cardiologo
      : (porRol.medico ?? []),
    ANTROPOMETRIA: porRol.nutricionista ?? [],
  };

  // Tipos habilitados: los que tienen al menos un profesional en el pool.
  const tiposHabilitados = tiposPonderados.filter((t) => poolPorTipo[t].length > 0);
  const tiposOmitidos = [...new Set(tiposPonderados)].filter((t) => poolPorTipo[t].length === 0);
  if (tiposOmitidos.length > 0) {
    console.log(`  ⚠️  Tipos omitidos (sin profesional elegible): ${tiposOmitidos.join(", ")}`);
  }
  if (tiposHabilitados.length === 0) {
    console.error("No hay ningún profesional elegible en Clerk. Abortando.");
    process.exit(1);
  }

  // 2. Leer deportistas.
  const deportistas = await sql.query('SELECT id FROM "deportistas"');
  if (deportistas.length === 0) {
    console.error("No hay deportistas. Corré primero: npm run seed:deportistas");
    process.exit(1);
  }
  console.log(`  ✓ ${deportistas.length} deportistas encontrados`);

  // 3. Limpiar (idempotencia). seguimientos borra en cascada los satélites.
  await sql.query('DELETE FROM "seguimientos"');
  console.log("  ✓ seguimientos limpiados (cascade sobre satélites)");

  // 4. Generar filas.
  const seguimientoRows = [];
  const traumaRows = [];
  const historiaRows = [];
  const psicoRows = [];
  const cardioRows = [];
  const antropoRows = [];

  for (const dep of deportistas) {
    const cantidad = randInt(10, 14);
    for (let i = 0; i < cantidad; i++) {
      const tipo = rand(tiposHabilitados);
      const pool = poolPorTipo[tipo];
      const profesionalId = rand(pool);
      const seguimientoId = randomUUID();
      const fecha = fechaPasada(18);
      const proximaCita = chance(0.4) ? fechaFutura(90) : null;
      const cat = catalogos[tipo];
      // created_at/updated_at: @updatedAt no tiene default a nivel DB (Prisma lo
      // maneja en app), así que en un INSERT crudo hay que setearlo. Los alineo
      // con la fecha del seguimiento para coherencia.
      const timestamp = fecha;

      seguimientoRows.push({
        id: seguimientoId,
        deportista_id: dep.id,
        profesional_id: profesionalId,
        fecha,
        titulo: rand(cat.titulos),
        descripcion: rand(cat.descripciones),
        recomendaciones: rand(cat.recomendaciones),
        resultados_evaluacion: rand(cat.resultados),
        prioridad: rand(prioridadesPonderadas),
        proxima_cita: proximaCita,
        alerta_seguimiento: chance(0.15) ? rand(alertasPosibles) : null,
        tipo_seguimiento: tipo,
        created_at: timestamp,
        updated_at: timestamp,
      });

      switch (tipo) {
        case "TRAUMATOLOGIA":
          traumaRows.push(buildTraumatologia(seguimientoId));
          break;
        case "HISTORIA_CLINICA":
          historiaRows.push(buildHistoriaClinica(seguimientoId));
          break;
        case "EVALUACION_PSICOLOGICA":
          psicoRows.push(buildEvaluacionPsicologica(seguimientoId));
          break;
        case "EVALUACION_CARDIOLOGICA":
          cardioRows.push(buildEvaluacionCardiologica(seguimientoId));
          break;
        case "ANTROPOMETRIA":
          antropoRows.push(buildAntropometria(seguimientoId));
          break;
        // GENERICO: sin satélite.
      }
    }
  }

  // 5. Insertar en chunks. Primero seguimientos (FK padre), luego satélites.
  await insertAll(
    "seguimientos",
    [
      "id", "deportista_id", "profesional_id", "fecha", "titulo", "descripcion",
      "recomendaciones", "resultados_evaluacion", "prioridad", "proxima_cita",
      "alerta_seguimiento", "tipo_seguimiento", "created_at", "updated_at",
    ],
    seguimientoRows
  );
  console.log(`  ✓ ${seguimientoRows.length} filas en seguimientos`);

  await insertAll(
    "seguimientos_traumatologia",
    [
      "id", "seguimiento_id", "estabilidad_hombro", "estabilidad_rodilla",
      "estabilidad_tobillo", "movilidad_hombro", "movilidad_cadera",
      "movilidad_rodilla", "movilidad_tobillo", "discrepancia_asimetria",
      "postura", "laxitud", "podoscopia", "observaciones",
    ],
    traumaRows
  );
  console.log(`  ✓ ${traumaRows.length} filas en seguimientos_traumatologia`);

  await insertAll(
    "seguimientos_historia_clinica",
    [
      "id", "seguimiento_id", "tension_arterial", "auscultacion_pulmonar",
      "av_ojo_derecho", "av_ojo_izquierdo", "diagnostico",
    ],
    historiaRows
  );
  console.log(`  ✓ ${historiaRows.length} filas en seguimientos_historia_clinica`);

  await insertAll(
    "seguimientos_evaluacion_psicologica",
    [
      "id", "seguimiento_id", "cprd_control_estres", "cprd_influencia_evaluacion",
      "cprd_motivacion", "cprd_habilidad_mental", "cprd_cohesion_equipo",
      "sociograma", "poms", "stai_rasgo", "stai_estado", "observaciones",
    ],
    psicoRows
  );
  console.log(`  ✓ ${psicoRows.length} filas en seguimientos_evaluacion_psicologica`);

  await insertAll(
    "seguimientos_evaluacion_cardiologica",
    [
      "id", "seguimiento_id", "ecg", "examen_fisico", "sintomas",
      "estudios_anteriores", "diagnostico", "observaciones",
    ],
    cardioRows
  );
  console.log(`  ✓ ${cardioRows.length} filas en seguimientos_evaluacion_cardiologica`);

  await insertAll(
    "seguimientos_antropometria",
    [
      "id", "seguimiento_id", "peso", "talla", "tsen", "perimetro_brazo",
      "perimetro_muslo_medio", "perimetro_pantorrilla", "cintura_minima",
      "cadera_maxima", "pliegue_triceps", "pliegue_subescapular",
      "pliegue_supraespinal", "pliegue_abdominal", "pliegue_muslo",
      "pliegue_pantorrilla", "imc", "sumatoria_pliegues",
    ],
    antropoRows
  );
  console.log(`  ✓ ${antropoRows.length} filas en seguimientos_antropometria`);

  // 6. Conteos reales desde la DB.
  const [{ total }] = await sql.query('SELECT COUNT(*)::int AS total FROM "seguimientos"');
  const [{ trauma }] = await sql.query('SELECT COUNT(*)::int AS trauma FROM "seguimientos_traumatologia"');
  const [{ historia }] = await sql.query('SELECT COUNT(*)::int AS historia FROM "seguimientos_historia_clinica"');
  const [{ psico }] = await sql.query('SELECT COUNT(*)::int AS psico FROM "seguimientos_evaluacion_psicologica"');
  const [{ cardio }] = await sql.query('SELECT COUNT(*)::int AS cardio FROM "seguimientos_evaluacion_cardiologica"');
  const [{ antropo }] = await sql.query('SELECT COUNT(*)::int AS antropo FROM "seguimientos_antropometria"');
  const [{ min_por_dep }] = await sql.query(
    'SELECT MIN(c)::int AS min_por_dep FROM (SELECT COUNT(*) AS c FROM "seguimientos" GROUP BY deportista_id) t'
  );
  const [{ sin_seguimientos }] = await sql.query(
    'SELECT COUNT(*)::int AS sin_seguimientos FROM "deportistas" d WHERE NOT EXISTS (SELECT 1 FROM "seguimientos" s WHERE s.deportista_id = d.id)'
  );

  console.log("\nConteos finales (desde la DB):");
  console.log(`  seguimientos                          ${total}`);
  console.log(`  seguimientos_traumatologia            ${trauma}`);
  console.log(`  seguimientos_historia_clinica         ${historia}`);
  console.log(`  seguimientos_evaluacion_psicologica   ${psico}`);
  console.log(`  seguimientos_evaluacion_cardiologica  ${cardio}`);
  console.log(`  seguimientos_antropometria            ${antropo}`);
  console.log(`\n  mínimo de seguimientos por deportista  ${min_por_dep} (debe ser >= 10)`);
  console.log(`  deportistas sin seguimientos           ${sin_seguimientos} (debe ser 0)`);
  console.log(`  total deportistas                      ${deportistas.length}`);
  console.log("✓ Seed completado.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
