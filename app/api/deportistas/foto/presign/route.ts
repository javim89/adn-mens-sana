import { contextoApi } from '@/lib/tenant/contexto';
import { z } from 'zod';
import { createUploadUrl } from '@/lib/s3';
import { FOTO_MAX_BYTES, FOTO_TIPOS } from '@/lib/foto-constants';
import type { JsonApiErrors } from '@/lib/types/jsonapi';

const JSON_API_CONTENT_TYPE = 'application/vnd.api+json';

const contentTypeValues = Object.keys(FOTO_TIPOS) as [keyof typeof FOTO_TIPOS, ...(keyof typeof FOTO_TIPOS)[]];

const presignAttributesSchema = z.object({
  contentType: z.enum(contentTypeValues, {
    error: 'Tipo de archivo no permitido. Usá JPG, PNG o WebP',
  }),
  size: z
    .number()
    .int()
    .positive('El archivo está vacío')
    .max(FOTO_MAX_BYTES, 'La foto no puede superar los 5 MB'),
});

const presignBodySchema = z.object({
  data: z.object({
    type: z.literal('foto-upload'),
    attributes: presignAttributesSchema,
  }),
});

function errorResponse(status: number, body: JsonApiErrors): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': JSON_API_CONTENT_TYPE },
  });
}

export async function POST(request: Request) {
  const acceso = await contextoApi();
  if (!acceso.ok) return acceso.response;

  if (acceso.contexto.rol === 'social') {
    return errorResponse(403, {
      errors: [{ status: '403', code: 'FORBIDDEN', title: 'No tenés permiso para subir fotos' }],
    });
  }

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
    const { uploadUrl, key } = await createUploadUrl({
      ...parsed.data.data.attributes,
      clubId: acceso.contexto.clubId,
    });
    return new Response(
      JSON.stringify({ data: { type: 'foto-upload', attributes: { uploadUrl, key } } }),
      { status: 200, headers: { 'Content-Type': JSON_API_CONTENT_TYPE } },
    );
  } catch (error) {
    console.error('POST /api/deportistas/foto/presign error:', error);
    return errorResponse(500, {
      errors: [{ status: '500', code: 'INTERNAL_ERROR', title: 'No se pudo preparar la subida de la foto' }],
    });
  }
}
