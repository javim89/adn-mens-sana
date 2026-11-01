/**
 * PUT prefirmado para subir el logo del club activo. Solo admin.
 *
 * El cliente rasteriza el logo y lo sube siempre como PNG; la key queda bajo el
 * prefijo del club de la sesión. Se pide recién al guardar `/configuracion`, para
 * no dejar objetos huérfanos.
 */

import { contextoApi } from '@/lib/tenant/contexto';
import { z } from 'zod';
import { createLogoUploadUrl } from '@/lib/s3';
import { LOGO_CONTENT_TYPE, LOGO_MAX_BYTES } from '@/lib/foto-constants';
import type { JsonApiErrors } from '@/lib/types/jsonapi';

const JSON_API_CONTENT_TYPE = 'application/vnd.api+json';

const presignBodySchema = z.object({
  data: z.object({
    type: z.literal('logo-upload'),
    attributes: z.object({
      contentType: z.literal(LOGO_CONTENT_TYPE, { error: 'El logo tiene que ser PNG' }),
      size: z
        .number()
        .int()
        .positive('El archivo está vacío')
        .max(LOGO_MAX_BYTES, 'El logo no puede superar los 2 MB'),
    }),
  }),
});

function errorResponse(status: number, body: JsonApiErrors): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': JSON_API_CONTENT_TYPE },
  });
}

export async function POST(request: Request) {
  const acceso = await contextoApi(['admin']);
  if (!acceso.ok) return acceso.response;

  const contentType = request.headers.get('Content-Type') ?? '';
  if (!contentType.includes(JSON_API_CONTENT_TYPE)) {
    return errorResponse(415, {
      errors: [
        {
          status: '415',
          code: 'UNSUPPORTED_MEDIA_TYPE',
          title: 'Tipo de contenido no soportado. Use application/vnd.api+json',
        },
      ],
    });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return errorResponse(400, {
      errors: [{ status: '400', code: 'INVALID_JSON', title: 'JSON inválido' }],
    });
  }

  const parsed = presignBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return errorResponse(422, {
      errors: parsed.error.issues.map((e) => ({
        status: '422',
        code: 'VALIDATION_ERROR',
        title: e.message,
        source: { pointer: `/data/attributes/${String(e.path[e.path.length - 1] ?? '')}` },
      })),
    });
  }

  try {
    const { uploadUrl, key } = await createLogoUploadUrl({
      size: parsed.data.data.attributes.size,
      clubId: acceso.contexto.clubId,
    });
    return new Response(
      JSON.stringify({ data: { type: 'logo-upload', attributes: { uploadUrl, key } } }),
      { status: 200, headers: { 'Content-Type': JSON_API_CONTENT_TYPE } },
    );
  } catch (error) {
    console.error('POST /api/club/logo/presign error:', error);
    return errorResponse(500, {
      errors: [{ status: '500', code: 'INTERNAL_ERROR', title: 'No se pudo preparar la subida del logo' }],
    });
  }
}
