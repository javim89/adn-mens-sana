/**
 * Fetch helpers del club activo, para Client Components.
 */

import { LOGO_CONTENT_TYPE } from '@/lib/foto-constants';

const JSON_API_CONTENT_TYPE = 'application/vnd.api+json';

async function mensajeDeError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return body?.errors?.[0]?.detail ?? body?.errors?.[0]?.title ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Sube el logo (ya convertido a PNG) directo a S3: pide un PUT prefirmado y manda
 * el archivo. Devuelve la key para pasarla a `guardarConfiguracionClub`.
 */
export async function subirLogoClub(file: File): Promise<string> {
  const presignRes = await fetch('/api/club/logo/presign', {
    method: 'POST',
    headers: { 'Content-Type': JSON_API_CONTENT_TYPE, Accept: JSON_API_CONTENT_TYPE },
    body: JSON.stringify({
      data: { type: 'logo-upload', attributes: { contentType: LOGO_CONTENT_TYPE, size: file.size } },
    }),
  });
  if (!presignRes.ok) throw new Error(await mensajeDeError(presignRes, 'No se pudo preparar la subida del logo'));
  const { data } = (await presignRes.json()) as {
    data: { type: 'logo-upload'; attributes: { uploadUrl: string; key: string } };
  };

  let uploadRes: Response;
  try {
    uploadRes = await fetch(data.attributes.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': LOGO_CONTENT_TYPE },
      body: file,
    });
  } catch {
    throw new Error('No se pudo subir el logo. Revisá tu conexión e intentá de nuevo');
  }
  if (!uploadRes.ok) throw new Error('No se pudo subir el logo. Intentá de nuevo');

  return data.attributes.key;
}
