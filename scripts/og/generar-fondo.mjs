// Fondo/arte para el modo híbrido (sin texto ni UI).
// Uso: node scripts/og/generar-fondo.mjs [--layout centrado|tres-cuartos] [--modelo google/gemini-3.1-flash-image]
//      [--n 2] [--resolucion 1K] [--salida scripts/og/out]
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { armarRequest, cantidad, leerApiKey, parsearArgs, slugModelo } from './lib.mjs';
import { generarImagen } from './openrouter.mjs';

const DIR = import.meta.dirname;
const args = parsearArgs(process.argv.slice(2));
const layout = args.layout ?? 'centrado';
const modelo = args.modelo ?? 'google/gemini-3.1-flash-image';
const n = cantidad(args.n, 2);
const salida = path.resolve(args.salida ?? path.join(DIR, 'out'));
const archivoPrompt = path.join(DIR, 'prompts', `fondo-${layout}.txt`);
if (!existsSync(archivoPrompt)) throw new Error(`No existe el prompt ${archivoPrompt}`);

const apiKey = leerApiKey({ archivoEnv: path.resolve(DIR, '../../.env.local') });
const body = armarRequest({ modelo, prompt: readFileSync(archivoPrompt, 'utf8'), aspectRatio: '16:9', resolucion: args.resolucion ?? '1K' });

mkdirSync(salida, { recursive: true });
console.log(`Fondo "${layout}" con ${modelo}: ${n} imagen(es), una llamada cada una`);
let total = 0;
for (let i = 1; i <= n; i++) {
  const { imagen, costo } = await generarImagen(apiKey, body);
  const archivo = path.join(salida, `fondo-${layout}-${slugModelo(modelo)}-${Date.now()}-${i}.png`);
  writeFileSync(archivo, await sharp(imagen).png().toBuffer());
  total += costo ?? 0;
  const { width, height } = await sharp(archivo).metadata();
  console.log(`  OK ${archivo} (${width}x${height}${costo != null ? `, USD ${costo.toFixed(4)}` : ''})`);
}
console.log(`Costo informado: USD ${total.toFixed(4)}`);
