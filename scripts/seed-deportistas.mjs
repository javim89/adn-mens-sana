#!/usr/bin/env node
/**
 * Seeds the "deportistas" table with realistic Argentine test data.
 * Uses Neon's HTTP driver (avoids the TCP/IPv6 issue like apply-migration.mjs).
 *
 * Generates 25-30 deportistas PER category found in "categorias".
 * The categorías are read from the DB (seeded by seed-calendario.mjs), not
 * hardcoded.
 *
 * ⚠️  IDEMPOTENCIA: Al inicio ejecuta `DELETE FROM "deportistas"`, lo que BORRA
 * TODOS los deportistas (y, por ON DELETE CASCADE, sus turno_deportistas y
 * seguimientos). Corré esto sólo en entornos de prueba.
 *
 * Usage: node scripts/seed-deportistas.mjs
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

// --- Catálogos de nombres/apellidos argentinos ------------------------------
const nombresMasc = [
  "Juan", "Lucas", "Matías", "Santiago", "Tomás", "Nicolás", "Franco", "Agustín",
  "Facundo", "Bautista", "Joaquín", "Benjamín", "Thiago", "Valentín", "Ignacio",
  "Gonzalo", "Federico", "Martín", "Emiliano", "Ramiro", "Julián", "Diego",
  "Gabriel", "Bruno", "Máximo", "Lautaro", "Dylan", "Ezequiel", "Alan", "Nahuel",
  "Ciro", "Felipe", "Simón", "Lorenzo", "Iván", "Marcos", "Pedro", "Enzo",
];
const nombresFem = [
  "Sofía", "Martina", "Valentina", "Catalina", "Emilia", "Julieta", "Camila",
  "Mía", "Isabella", "Lucía", "Renata", "Delfina", "Victoria", "Guadalupe",
  "Josefina", "Paula", "Malena", "Antonella", "Florencia", "Agostina", "Milagros",
  "Abril", "Zoe", "Pilar", "Morena", "Bianca", "Micaela", "Rocío", "Candela", "Luna",
];
const apellidos = [
  "González", "Rodríguez", "Fernández", "López", "Martínez", "García", "Pérez",
  "Sánchez", "Romero", "Sosa", "Torres", "Álvarez", "Ruiz", "Díaz", "Acosta",
  "Benítez", "Medina", "Suárez", "Herrera", "Aguirre", "Gómez", "Molina",
  "Silva", "Castro", "Rojas", "Ortiz", "Núñez", "Luna", "Juárez", "Cabrera",
  "Ramírez", "Flores", "Vega", "Godoy", "Ferreyra", "Vera", "Ledesma", "Peralta",
  "Ríos", "Domínguez", "Coronel", "Villalba", "Quiroga", "Ojeda", "Maidana",
  "Correa", "Bianchi", "Paredes", "Cardozo", "Mansilla",
];

const posiciones = [
  "Arquero", "Defensor Central", "Lateral Derecho", "Lateral Izquierdo",
  "Mediocampista Central", "Volante Derecho", "Volante Izquierdo",
  "Enganche", "Delantero", "Extremo Derecho", "Extremo Izquierdo",
];

const nacionalidades = ["Argentina", "Argentina", "Argentina", "Argentina", "Uruguaya", "Paraguaya"];

const generosMasc = "MASCULINO";
const generosFem = "FEMENINO";

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

// Reemplaza acentos/ñ y espacios para armar emails.
function slug(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9]+/g, "");
}

// Devuelve una fecha ISO (medianoche UTC) para una edad dada en años.
function fechaNacimientoParaEdad(edad) {
  const hoy = new Date();
  const anio = hoy.getUTCFullYear() - edad;
  const mes = randInt(0, 11);
  const dia = randInt(1, 28);
  return new Date(Date.UTC(anio, mes, dia)).toISOString();
}

// Mapea nombre de categoría -> rango de edad razonable [min, max].
function rangoEdadPorCategoria(nombre) {
  const n = nombre.toUpperCase();
  const numMatch = n.match(/SUB-?(\d+)/);
  if (numMatch) {
    const top = parseInt(numMatch[1], 10);
    return [Math.max(8, top - 2), top]; // SUB-12 => 10-12, etc.
  }
  if (n.includes("VETERANO")) return [35, 50];
  if (n.includes("SENIOR")) return [30, 42];
  if (n.includes("PRIMERA") || n.includes("HONOR") || n.includes("RESERVA")) return [18, 30];
  // Divisiones juveniles del fútbol argentino: 9na (más chica) .. 4ta (más grande).
  const divMatch = n.match(/^(\d+)/);
  if (divMatch) {
    const div = parseInt(divMatch[1], 10); // 4..9
    // 9na ~ 13-14, 4ta ~ 19-20 (interpolación inversa)
    const base = 22 - div; // 9->13, 4->18
    return [Math.max(12, base), base + 2];
  }
  return [14, 22]; // fallback
}

// Fecha de ingreso reciente (últimos 4 años), ISO medianoche UTC.
function fechaIngresoReciente() {
  const hoy = new Date();
  const anio = hoy.getUTCFullYear() - randInt(0, 3);
  const mes = randInt(0, 11);
  const dia = randInt(1, 28);
  return new Date(Date.UTC(anio, mes, dia)).toISOString();
}

const estadosPonderados = [
  "ACTIVO", "ACTIVO", "ACTIVO", "ACTIVO", "ACTIVO", "ACTIVO", "ACTIVO", "ACTIVO",
  "LESIONADO", "INACTIVO", "SUSPENDIDO",
];
const actividadComplementaria = ["GIMNASIO", "TECNICA_INDIVIDUAL", "AMBAS", "NINGUNA"];
const provincias = [
  "Buenos Aires", "Buenos Aires", "Buenos Aires", "Buenos Aires", "Buenos Aires",
  "Buenos Aires", "Buenos Aires", "Córdoba", "Santa Fe", "Entre Ríos",
];
const ciudades = [
  "La Plata", "La Plata", "La Plata", "La Plata", "La Plata", "La Plata",
  "Berisso", "Ensenada", "City Bell", "Gonnet", "Villa Elisa",
];

// --- Multi-row parameterized insert helper (idéntico a seed-calendario.mjs) --
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

const COLUMNS = [
  "id", "apellido", "nombre", "dni", "fecha_nacimiento",
  "provincia", "ciudad", "genero", "telefono", "email",
  "domicilio_actual", "nacionalidad", "contacto_emergencia",
  "vive_pension_club", "vive_pension_externa", "observaciones",
  "disciplina_id", "categoria_id", "posicion", "estado",
  "actividad_complementaria", "fecha_ingreso", "es_representante",
  "created_at", "updated_at",
];

async function main() {
  console.log("Seeding Deportistas (datos de prueba)...");

  // 1. Leer categorías reales (no hardcodear ids).
  const categorias = await sql.query('SELECT id, nombre, orden FROM "categorias" ORDER BY "orden"');
  if (categorias.length === 0) {
    console.error("No hay categorías. Corré primero: npm run seed:calendario");
    process.exit(1);
  }
  console.log(`  ✓ ${categorias.length} categorías encontradas`);

  // 1b. Resolver la disciplina FUTBOL por codigo (ahora es FK, no enum).
  const futbolRows = await sql.query('SELECT id FROM "disciplinas" WHERE codigo = $1', ["FUTBOL"]);
  if (futbolRows.length === 0) {
    console.error("No se encontró la disciplina FUTBOL. Corré primero: node scripts/seed-disciplinas.mjs");
    process.exit(1);
  }
  const futbolId = futbolRows[0].id;

  // 2. Limpiar (BORRA TODOS los deportistas; cascade sobre turnos y seguimientos).
  await sql.query('DELETE FROM "deportistas"');
  console.log("  ✓ deportistas limpiados (DELETE FROM deportistas)");

  // 3. Generar filas.
  const dniUsados = new Set();
  const emailUsados = new Set();
  const rows = [];
  const nowIso = new Date().toISOString();

  const conteoPorCategoria = {};

  for (const cat of categorias) {
    const cantidad = randInt(25, 30);
    conteoPorCategoria[cat.nombre] = cantidad;
    const [edadMin, edadMax] = rangoEdadPorCategoria(cat.nombre);

    for (let i = 0; i < cantidad; i++) {
      const esFem = chance(0.2); // club de fútbol juvenil: mayoría masculino
      const nombre = esFem ? rand(nombresFem) : rand(nombresMasc);
      const genero = esFem ? generosFem : generosMasc;
      const apellido = rand(apellidos);

      // DNI único (7-8 dígitos).
      let dni;
      do {
        dni = String(randInt(20000000, 62000000));
      } while (dniUsados.has(dni));
      dniUsados.add(dni);

      // Email único (a veces null).
      let email = null;
      if (chance(0.85)) {
        const baseEmail = `${slug(nombre)}.${slug(apellido)}`;
        let candidate = `${baseEmail}@example.com`;
        let n = 1;
        while (emailUsados.has(candidate)) {
          candidate = `${baseEmail}${n}@example.com`;
          n++;
        }
        emailUsados.add(candidate);
        email = candidate;
      }

      const edad = randInt(edadMin, edadMax);
      const ciudad = rand(ciudades);
      const provincia = rand(provincias);
      const telefono = `221${randInt(4000000, 6999999)}`;
      const vivePensionClub = chance(0.08);
      const vivePensionExterna = !vivePensionClub && chance(0.05);

      rows.push({
        id: randomUUID(),
        apellido,
        nombre,
        dni,
        fecha_nacimiento: fechaNacimientoParaEdad(edad),
        provincia,
        ciudad,
        genero,
        telefono,
        email,
        domicilio_actual: `Calle ${randInt(1, 80)} N° ${randInt(100, 2500)}, ${ciudad}`,
        nacionalidad: rand(nacionalidades),
        contacto_emergencia: `${rand(apellidos)} ${rand([...nombresMasc, ...nombresFem])} - 221${randInt(4000000, 6999999)}`,
        vive_pension_club: vivePensionClub,
        vive_pension_externa: vivePensionExterna,
        observaciones: chance(0.25) ? "Sin observaciones relevantes." : null,
        disciplina_id: futbolId,
        categoria_id: cat.id,
        posicion: rand(posiciones),
        estado: rand(estadosPonderados),
        actividad_complementaria: rand(actividadComplementaria),
        fecha_ingreso: fechaIngresoReciente(),
        es_representante: chance(0.05),
        created_at: nowIso,
        updated_at: nowIso,
      });
    }
  }

  // 4. Insertar en chunks de ~30.
  const chunkSize = 30;
  for (let i = 0; i < rows.length; i += chunkSize) {
    await insertRows("deportistas", COLUMNS, rows.slice(i, i + chunkSize));
  }
  console.log(`  ✓ ${rows.length} deportistas insertados`);

  // 5. Verificación y conteos.
  const [{ total }] = await sql.query('SELECT COUNT(*)::int AS total FROM "deportistas"');
  console.log("\nDeportistas por categoría:");
  for (const cat of categorias) {
    console.log(`  ${cat.nombre.padEnd(20)} ${conteoPorCategoria[cat.nombre]}`);
  }
  console.log(`\nConteos finales: ${total} deportistas en ${categorias.length} categorías.`);
  console.log("✓ Seed completado.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
