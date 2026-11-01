/**
 * Fotos de perfil de deportistas y logos de clubes en S3. Solo servidor: usa credenciales.
 *
 * El bucket es privado: la DB guarda solo la key y para mostrar la foto se
 * genera una URL GET prefirmada. El browser sube directo a S3 con un PUT
 * prefirmado, así el archivo no pasa por las funciones de Netlify.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  FOTO_MAX_BYTES,
  FOTO_TIPOS,
  LOGO_CONTENT_TYPE,
  LOGO_MAX_BYTES,
  isFotoContentType,
} from '@/lib/foto-constants';

export { FOTO_MAX_BYTES, FOTO_TIPOS, LOGO_CONTENT_TYPE, LOGO_MAX_BYTES } from '@/lib/foto-constants';

const UPLOAD_EXPIRES_SECONDS = 5 * 60;
const DOWNLOAD_EXPIRES_SECONDS = 60 * 60;
/**
 * Formatos de key de una foto de deportista:
 * - nuevo: `clubes/<clubId>/deportistas/<uuid>.<ext>` — cada club en su prefijo;
 * - legacy: `deportistas/<uuid>.<ext>` — las fotos de antes del multi-tenant (todas
 *   de Gimnasia). Se siguen leyendo, pero no se generan ni se asignan de nuevo.
 */
const FOTO_KEY_REGEX =
  /^(?:clubes\/[A-Za-z0-9_-]+\/)?deportistas\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

/**
 * Formatos de key del logo de un club (siempre PNG):
 * - nuevo: `clubes/<clubId>/logo/<uuid>.png` — cada subida tiene key nueva, que
 *   funciona como versión (el logo se sirve con cache immutable);
 * - legacy: `clubes/<clubId>/logo.png` — el escudo de Gimnasia que subió
 *   `scripts/subir-logo-club.mjs`. Se sigue sirviendo; no se generan nuevas.
 */
const LOGO_KEY_REGEX = /^clubes\/([A-Za-z0-9_-]+)\/logo(?:\/[0-9a-f-]{36})?\.png$/;

function prefijoDelClub(clubId: string): string {
  return `clubes/${clubId}/deportistas/`;
}

type S3Config = { client: S3Client; bucket: string };

let s3Config: S3Config | null = null;

// Prefijo S3_ (no AWS_): Netlify/Lambda reservan AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY y AWS_REGION.
function getS3Config(): S3Config | null {
  if (s3Config) return s3Config;

  const { S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;
  if (!S3_REGION || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) return null;

  s3Config = {
    bucket: S3_BUCKET,
    client: new S3Client({
      region: S3_REGION,
      credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
      // Sin esto el SDK agrega un checksum CRC32 del body vacío a la URL prefirmada
      // y S3 rechaza el PUT que hace el browser con el archivo real.
      requestChecksumCalculation: 'WHEN_REQUIRED',
    }),
  };
  return s3Config;
}

function requireS3Config(): S3Config {
  const config = getS3Config();
  if (!config) throw new Error('S3 no está configurado (faltan variables S3_*)');
  return config;
}

export function isValidFotoKey(key: unknown): key is string {
  return typeof key === 'string' && FOTO_KEY_REGEX.test(key);
}

/**
 * La key es válida y vive bajo el prefijo de `clubId`. Una key legacy da `false`:
 * no dice de qué club es, así que no se puede asignar ni borrar por pedido del
 * cliente (sí se conserva la que un deportista ya tenía).
 */
export function keyEsDelClub(key: unknown, clubId: string): key is string {
  return isValidFotoKey(key) && !!clubId && key.startsWith(prefijoDelClub(clubId));
}

export function isValidLogoKey(key: unknown): key is string {
  return typeof key === 'string' && LOGO_KEY_REGEX.test(key);
}

/** La key es un logo válido y el club de su prefijo es exactamente `clubId`. */
export function keyLogoEsDelClub(key: unknown, clubId: string): key is string {
  if (typeof key !== 'string' || !clubId) return false;
  const m = LOGO_KEY_REGEX.exec(key);
  return m !== null && m[1] === clubId;
}

/**
 * Un logo del club que se puede BORRAR: solo los subidos desde `/configuracion`
 * (`clubes/<clubId>/logo/<uuid>.png`). La key legacy (`clubes/<clubId>/logo.png`, el
 * escudo original de Gimnasia) nunca se borra: es el único original que hay.
 */
export function keyLogoBorrable(key: unknown, clubId: string): key is string {
  return keyLogoEsDelClub(key, clubId) && /\/logo\/[0-9a-f-]{36}\.png$/.test(key);
}

/** PUT prefirmado para un logo nuevo del club: solo PNG de hasta 2 MB. */
export async function createLogoUploadUrl({
  size,
  clubId,
}: {
  size: number;
  /** El club de la sesión: la key queda bajo su prefijo. */
  clubId: string;
}): Promise<{ uploadUrl: string; key: string }> {
  if (!Number.isInteger(size) || size <= 0 || size > LOGO_MAX_BYTES) {
    throw new Error('El logo no puede superar los 2 MB');
  }

  const { client, bucket } = requireS3Config();
  if (!clubId) throw new Error('Falta el club para generar la key del logo');
  const key = `clubes/${clubId}/logo/${crypto.randomUUID()}.png`;

  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: LOGO_CONTENT_TYPE,
      ContentLength: size,
    }),
    {
      expiresIn: UPLOAD_EXPIRES_SECONDS,
      signableHeaders: new Set(['content-type', 'content-length']),
    },
  );

  return { uploadUrl, key };
}

export async function createUploadUrl({
  contentType,
  size,
  clubId,
}: {
  contentType: string;
  size: number;
  /** El club de la sesión: la key queda bajo su prefijo. */
  clubId: string;
}): Promise<{ uploadUrl: string; key: string }> {
  if (!isFotoContentType(contentType)) {
    throw new Error('Tipo de archivo no permitido. Usá JPG, PNG o WebP');
  }
  if (!Number.isInteger(size) || size <= 0 || size > FOTO_MAX_BYTES) {
    throw new Error('La foto no puede superar los 5 MB');
  }

  const { client, bucket } = requireS3Config();
  if (!clubId) throw new Error('Falta el club para generar la key de la foto');
  const key = `${prefijoDelClub(clubId)}${crypto.randomUUID()}.${FOTO_TIPOS[contentType]}`;

  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: size,
    }),
    {
      expiresIn: UPLOAD_EXPIRES_SECONDS,
      // Firmar estos headers hace que S3 rechace un archivo de otro tipo o tamaño.
      signableHeaders: new Set(['content-type', 'content-length']),
    },
  );

  return { uploadUrl, key };
}

export async function getFotoUrl(key: string | null | undefined): Promise<string | null> {
  if (!key) return null;

  const config = getS3Config();
  if (!config) return null;

  try {
    return await getSignedUrl(
      config.client,
      new GetObjectCommand({ Bucket: config.bucket, Key: key }),
      { expiresIn: DOWNLOAD_EXPIRES_SECONDS },
    );
  } catch (error) {
    console.error('getFotoUrl error:', error);
    return null;
  }
}

function isNotFoundError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { name, $metadata } = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return name === 'NotFound' || name === 'NoSuchKey' || $metadata?.httpStatusCode === 404;
}

/**
 * true si el objeto existe en el bucket, false si S3 responde 404.
 * Cualquier otro error (credenciales, red, S3 sin configurar) se relanza: no
 * podemos afirmar que la foto no existe. Requiere s3:ListBucket en la policy;
 * sin ese permiso S3 responde 403 (no 404) a un objeto inexistente.
 */
export async function fotoExiste(key: string): Promise<boolean> {
  const { client, bucket } = requireS3Config();
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    if (isNotFoundError(error)) return false;
    throw error;
  }
}

export type ObjetoS3 = {
  body: ReadableStream<Uint8Array>;
  contentType: string | null;
  contentLength: number | null;
};

/**
 * Lee un objeto del bucket como stream (para servirlo desde una ruta propia).
 * `null` si no existe; cualquier otro error se relanza.
 */
export async function leerObjeto(key: string): Promise<ObjetoS3 | null> {
  const { client, bucket } = requireS3Config();
  try {
    const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!res.Body) return null;
    return {
      body: res.Body.transformToWebStream() as ReadableStream<Uint8Array>,
      contentType: res.ContentType ?? null,
      contentLength: res.ContentLength ?? null,
    };
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
}

export async function deleteFoto(key: string | null | undefined): Promise<void> {
  if (!key) return;

  try {
    const { client, bucket } = requireS3Config();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (error) {
    console.error('deleteFoto error:', error);
  }
}
