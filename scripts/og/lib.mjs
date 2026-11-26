// Helpers puros del pipeline de la imagen OG. No corre en la app ni en el build.
import { readFileSync, existsSync } from 'node:fs';

export const API_IMAGENES = 'https://openrouter.ai/api/v1/images';
export const MAX_POR_CORRIDA = 4;
export const ANCHO = 1200;
export const ALTO = 630;

/**
 * Los colores de la plantilla. Son los de `TEMA_BIOTEAM` (`lib/branding/tokens.ts`):
 * `lib.test.ts` falla si se desincronizan. Fuera de estos, la plantilla solo usa negro y
 * blanco con alpha.
 */
export const PALETA = {
  primario: '#121a61',
  primarioHover: '#1e2a8a',
  secundario: '#3346cc',
  acento: '#c9a84c',
  blanco: '#ffffff',
};

const ERROR_SIN_KEY = 'Falta OPEN_ROUTER_API_KEY en .env.local';

function valorDeLinea(crudo) {
  const v = crudo.trim();
  const comilla = v[0];
  if (comilla === '"' || comilla === "'") {
    const fin = v.indexOf(comilla, 1);
    return fin === -1 ? '' : v.slice(1, fin);
  }
  return v.replace(/\s+#.*$/, '').trim();
}

/**
 * Lee solo `OPEN_ROUTER_API_KEY` de `.env.local` (con fallback al env). Nunca incluye el
 * contenido del archivo en un error.
 */
export function leerApiKey({ archivoEnv = '.env.local', env = process.env } = {}) {
  if (existsSync(archivoEnv)) {
    for (const linea of readFileSync(archivoEnv, 'utf8').split(/\r?\n/)) {
      const m = /^\s*(?:export\s+)?OPEN_ROUTER_API_KEY\s*=(.*)$/.exec(linea);
      if (!m) continue;
      const valor = valorDeLinea(m[1]);
      if (valor) return valor;
    }
  }
  const delEnv = (env.OPEN_ROUTER_API_KEY ?? '').trim();
  if (delEnv) return delEnv;
  throw new Error(ERROR_SIN_KEY);
}

export function dataUrl({ mime, base64 }) {
  return `data:${mime};base64,${base64}`;
}

/**
 * Body de `POST /api/v1/images` (Images API de OpenRouter). Se usa esa API y no
 * `chat/completions` porque acepta `aspect_ratio` y `resolution` como parámetros de primer
 * nivel para Gemini (`GET /api/v1/images/models/<id>/endpoints`).
 * @param {{ modelo: string, prompt: string, referencias?: Array<{ mime: string, base64: string }>, aspectRatio?: string, resolucion?: string }} opciones
 */
export function armarRequest({ modelo, prompt, referencias = [], aspectRatio = '16:9', resolucion = '1K' }) {
  const body = { model: modelo, prompt, n: 1, aspect_ratio: aspectRatio, resolution: resolucion };
  if (referencias.length > 0) {
    body.input_references = referencias.map((r) => ({ type: 'image_url', image_url: { url: dataUrl(r) } }));
  }
  return body;
}

function bufferDeDataUrl(url) {
  const m = /^data:[^;,]+;base64,(.+)$/s.exec(url ?? '');
  return m ? Buffer.from(m[1], 'base64') : null;
}

function truncar(texto, max = 300) {
  const t = typeof texto === 'string' ? texto : JSON.stringify(texto ?? '');
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

/**
 * La primera imagen de la respuesta, como `Buffer`. Acepta la forma de la Images API
 * (`data[].b64_json`) y la de chat completions (`choices[0].message.images[]`).
 */
export function extraerImagen(respuesta) {
  const item = respuesta?.data?.[0];
  if (item?.b64_json) return Buffer.from(item.b64_json, 'base64');
  const desdeData = bufferDeDataUrl(item?.url);
  if (desdeData) return desdeData;

  const mensaje = respuesta?.choices?.[0]?.message;
  const desdeChat = bufferDeDataUrl(mensaje?.images?.[0]?.image_url?.url);
  if (desdeChat) return desdeChat;

  const detalle = mensaje?.content ?? respuesta?.error?.message ?? '';
  throw new Error(`La respuesta no trae imagen${detalle ? `: ${truncar(detalle)}` : ''}`);
}

/** Mensaje de error de una respuesta HTTP: solo el status y `error.message`. */
export function mensajeDeError(status, cuerpo) {
  const msg = cuerpo?.error?.message;
  return `OpenRouter respondió ${status}${msg ? `: ${truncar(msg)}` : ''}`;
}

export function esReintentable(status) {
  return status === 429 || status >= 500;
}

/** `--clave valor` y `--bandera` → objeto. */
export function parsearArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      (args._ ??= []).push(a);
      continue;
    }
    const clave = a.slice(2);
    const sig = argv[i + 1];
    if (sig === undefined || sig.startsWith('--')) args[clave] = true;
    else {
      args[clave] = sig;
      i++;
    }
  }
  return args;
}

export function cantidad(valor, porDefecto) {
  const n = valor === undefined ? porDefecto : Number(valor);
  if (!Number.isInteger(n) || n < 1) throw new Error('--n tiene que ser un entero mayor a 0');
  if (n > MAX_POR_CORRIDA) throw new Error(`--n no puede pasar de ${MAX_POR_CORRIDA} por corrida`);
  return n;
}

export function slugModelo(modelo) {
  return modelo.replace(/^[^/]+\//, '').replace(/[^a-z0-9.-]+/gi, '-');
}
