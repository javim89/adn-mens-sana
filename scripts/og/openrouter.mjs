// Cliente mínimo de la Images API. La key solo va en el header Authorization: nunca se
// imprime ni se incluye en errores.
import { API_IMAGENES, esReintentable, extraerImagen, mensajeDeError } from './lib.mjs';

const TIMEOUT_MS = 120_000;
const BACKOFF_MS = 8_000;

async function pedir(apiKey, body) {
  const res = await fetch(API_IMAGENES, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'og-generator',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const cuerpo = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, cuerpo };
}

/** Una generación, con un solo reintento ante 429/5xx. Devuelve `{ imagen, costo }`. */
export async function generarImagen(apiKey, body) {
  let r = await pedir(apiKey, body);
  if (!r.ok && esReintentable(r.status)) {
    console.warn(`  ${mensajeDeError(r.status, r.cuerpo)}; reintento en ${BACKOFF_MS / 1000}s`);
    await new Promise((ok) => setTimeout(ok, BACKOFF_MS));
    r = await pedir(apiKey, body);
  }
  if (!r.ok) throw new Error(mensajeDeError(r.status, r.cuerpo));
  return { imagen: extraerImagen(r.cuerpo), costo: r.cuerpo?.usage?.cost ?? null };
}
