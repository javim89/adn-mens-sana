/**
 * Fotos de perfil de deportistas en S3. Solo servidor: usa credenciales.
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
import { FOTO_MAX_BYTES, FOTO_TIPOS, isFotoContentType } from '@/lib/foto-constants';

export { FOTO_MAX_BYTES, FOTO_TIPOS } from '@/lib/foto-constants';

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

export async function deleteFoto(key: string | null | undefined): Promise<void> {
  if (!key) return;

  try {
    const { client, bucket } = requireS3Config();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (error) {
    console.error('deleteFoto error:', error);
  }
}
