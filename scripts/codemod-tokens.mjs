#!/usr/bin/env node
/**
 * Reemplaza los hex arbitrarios de Tailwind (`text-[#121A61]`, `focus:ring-[#3346CC]/30`)
 * por los tokens del tema (`text-primario`, `focus:ring-secundario/30`). Conserva las
 * variantes y el modificador de opacidad.
 *
 * Alcance: `app/**`, `lib/**` y los tests de la raíz (`__tests__/**`), .ts/.tsx, sin
 * `app/_landing/**` ni `lib/generated/**`. Los hex sin token equivalente no se tocan:
 * van al reporte para resolverlos a mano.
 *
 * Uso:
 *   node scripts/codemod-tokens.mjs --dry   # solo reporte
 *   node scripts/codemod-tokens.mjs         # reescribe los archivos
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const DIRECTORIOS = ['app', 'lib', '__tests__'];
const EXCLUIDOS = ['app/_landing', 'lib/generated'];
const DRY = process.argv.includes('--dry');

/** Hex (mayúscula) → token. Del club y neutros: clases del @theme de globals.css. */
const MAPEO = {
  '121A61': 'primario',
  '1E2A8A': 'primario-hover',
  EEF0FB: 'primario-suave',
  '3346CC': 'secundario',
  C9A84C: 'acento',
  EADDB5: 'acento-suave',
  '1C1C1C': 'foreground',
  '6B7280': 'muted-foreground',
  F3F4F6: 'muted',
  F9FAFB: 'subtle',
  E5E7EB: 'border',
  FFFFFF: 'white',
  // Estados fijos: la clase equivalente de la paleta Tailwind.
  '065F46': 'emerald-800',
  D1FAE5: 'emerald-100',
  '7F1D1D': 'red-900',
  FEE2E2: 'red-100',
  DC2626: 'red-600',
  '7C2D12': 'orange-900',
  FED7AA: 'orange-200',
  '713F12': 'yellow-900',
  FEF9C3: 'yellow-100',
  B45309: 'amber-700',
  '0F766E': 'teal-700',
  '0E7490': 'cyan-700',
  '7C3AED': 'violet-600',
};

/** Sin token: se resuelven a mano (sugerencia: muted-foreground o primario/NN). */
const SOLO_REPORTE = new Set(['5B6478', '4A5368', 'B8BFD6', 'DFE3EF', 'CDD3E4', '6B8AE6', '8C6D1F']);

const UTILIDAD =
  /\b(text|bg|border(?:-[xytrblse])?|ring|outline|fill|stroke|from|via|to|accent|divide|placeholder|caret|decoration|shadow)-\[#([0-9a-fA-F]{6})\](\/\d{1,3})?/g;

function archivos(dir) {
  const salida = [];
  for (const nombre of readdirSync(dir)) {
    const abs = path.join(dir, nombre);
    const rel = path.relative(RAIZ, abs);
    if (EXCLUIDOS.some((e) => rel === e || rel.startsWith(e + path.sep))) continue;
    if (nombre === 'node_modules') continue;
    if (statSync(abs).isDirectory()) salida.push(...archivos(abs));
    else if (/\.(ts|tsx)$/.test(nombre)) salida.push(abs);
  }
  return salida;
}

const porToken = new Map();
const pendientes = []; // { archivo, linea, clase }
let archivosTocados = 0;
let total = 0;

for (const abs of DIRECTORIOS.flatMap((d) => archivos(path.join(RAIZ, d)))) {
  const rel = path.relative(RAIZ, abs);
  const original = readFileSync(abs, 'utf8');
  let cambios = 0;
  const nuevo = original.replace(UTILIDAD, (clase, utilidad, hex, opacidad = '', offset) => {
    const clave = hex.toUpperCase();
    const token = MAPEO[clave];
    if (!token) {
      const linea = original.slice(0, offset).split('\n').length;
      pendientes.push({ archivo: rel, linea, clase, sugerido: SOLO_REPORTE.has(clave) });
      return clase;
    }
    cambios++;
    porToken.set(`${clave} → ${token}`, (porToken.get(`${clave} → ${token}`) ?? 0) + 1);
    return `${utilidad}-${token}${opacidad}`;
  });
  if (cambios > 0) {
    archivosTocados++;
    total += cambios;
    if (!DRY) writeFileSync(abs, nuevo);
  }
}

console.log(`${DRY ? '[dry] ' : ''}${total} reemplazos en ${archivosTocados} archivos\n`);
console.log('Por token:');
for (const [k, n] of [...porToken].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${k}`);
}
if (pendientes.length > 0) {
  console.log(`\nSin token (${pendientes.length}), resolver a mano:`);
  for (const p of pendientes) {
    console.log(`  ${p.archivo}:${p.linea}  ${p.clase}${p.sugerido ? '' : '  (hex no listado)'}`);
  }
}
