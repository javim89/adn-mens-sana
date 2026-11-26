// Exporta el candidato elegido a public/brand/og-image.png: 1200x630 exacto, sin metadatos, < 300 KB.
// Uso: node scripts/og/finalizar.mjs <candidato.png> [--posicion centre|north|south|...] [--salida ruta.png]
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ALTO, ANCHO, parsearArgs } from './lib.mjs';

const MAX_BYTES = 300 * 1024;
const args = parsearArgs(process.argv.slice(2));
const candidato = args._?.[0];
if (!candidato) throw new Error('Uso: node scripts/og/finalizar.mjs <candidato.png>');
const salida = path.resolve(args.salida ?? path.resolve(import.meta.dirname, '../../public/brand/og-image.png'));

// sharp no copia EXIF/XMP/ICC salvo con withMetadata(): la salida va limpia.
const base = sharp(path.resolve(candidato)).resize(ANCHO, ALTO, { fit: 'cover', position: args.posicion ?? 'centre', kernel: 'lanczos3' });

const intentos = [
  { nombre: 'PNG sin pérdida', opts: { compressionLevel: 9, adaptiveFiltering: true } },
  { nombre: 'PNG paleta 256 colores', opts: { compressionLevel: 9, palette: true, colors: 256, quality: 95, dither: 0.6 } },
  { nombre: 'PNG paleta 192 colores', opts: { compressionLevel: 9, palette: true, colors: 192, quality: 90, dither: 0.8 } },
];

mkdirSync(path.dirname(salida), { recursive: true });
let elegido = null;
for (const intento of intentos) {
  const buf = await base.clone().png(intento.opts).toBuffer();
  if (buf.length <= MAX_BYTES) {
    elegido = { ...intento, buf };
    break;
  }
  console.log(`  ${intento.nombre}: ${Math.round(buf.length / 1024)} KB, no entra`);
}
if (!elegido) {
  throw new Error('Ningún PNG entra en 300 KB. Probá un fondo con menos grano o exportá JPEG q85 (cambia la ruta: avisar a frontend).');
}
writeFileSync(salida, elegido.buf);
const meta = await sharp(salida).metadata();
console.log(`OK ${salida}: ${meta.width}x${meta.height}, ${Math.round(elegido.buf.length / 1024)} KB (${elegido.nombre})`);
