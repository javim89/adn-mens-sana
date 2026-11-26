// Variante 100 % IA: la composición entera la hace el modelo, con la captura y el logo de referencia.
// Uso: node scripts/og/generar-completo.mjs [--modelo google/gemini-3-pro-image] [--n 2] [--resolucion 2K]
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ALTO, ANCHO, armarRequest, cantidad, leerApiKey, parsearArgs, slugModelo } from './lib.mjs';
import { generarImagen } from './openrouter.mjs';

const DIR = import.meta.dirname;
const RAIZ = path.resolve(DIR, '../..');
const OUT = path.join(DIR, 'out');
const args = parsearArgs(process.argv.slice(2));
const modelo = args.modelo ?? 'google/gemini-3-pro-image';
const n = cantidad(args.n, 2);

const png = (archivo) => ({ mime: 'image/png', base64: readFileSync(archivo).toString('base64') });
const referencias = [
  png(path.join(OUT, 'dashboard@2x.png')),
  png(path.join(RAIZ, 'public/brand/bioteam-logo-inverso.png')),
];

const apiKey = leerApiKey({ archivoEnv: path.join(RAIZ, '.env.local') });
const body = armarRequest({
  modelo,
  prompt: readFileSync(path.join(DIR, 'prompts', 'completo.txt'), 'utf8'),
  referencias,
  aspectRatio: '16:9',
  resolucion: args.resolucion ?? '2K',
});

mkdirSync(OUT, { recursive: true });
console.log(`Completo con ${modelo}: ${n} imagen(es), una llamada cada una`);
let total = 0;
for (let i = 1; i <= n; i++) {
  const { imagen, costo } = await generarImagen(apiKey, body);
  const sello = `${slugModelo(modelo)}-${Date.now()}-${i}`;
  writeFileSync(path.join(OUT, `completo-${sello}-crudo.png`), await sharp(imagen).png().toBuffer());
  const archivo = path.join(OUT, `completo-${sello}.png`);
  await sharp(imagen).resize(ANCHO, ALTO, { fit: 'cover', kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toFile(archivo);
  total += costo ?? 0;
  console.log(`  OK ${archivo}${costo != null ? ` (USD ${costo.toFixed(4)})` : ''}`);
}
console.log(`Costo informado: USD ${total.toFixed(4)}`);
