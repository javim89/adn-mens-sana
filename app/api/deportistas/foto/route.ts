import { contextoApi } from '@/lib/tenant/contexto';
import { deleteFoto, isValidFotoKey } from '@/lib/s3';
import { isFotoKeyEnUso } from '@/lib/foto-deportista';
import type { JsonApiErrors } from '@/lib/types/jsonapi';

const JSON_API_CONTENT_TYPE = 'application/vnd.api+json';

function errorResponse(status: number, body: JsonApiErrors): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': JSON_API_CONTENT_TYPE },
  });
}

/**
 * DELETE /api/deportistas/foto?key=<key>
 * Descarta una foto subida a S3 que no llegó a guardarse (el alta/edición falló
 * después del upload). Nunca borra una key que algún deportista tenga asignada.
 */
export async function DELETE(request: Request) {
  const acceso = await contextoApi();
  if (!acceso.ok) return acceso.response;

  if (acceso.contexto.rol === 'social') {
    return errorResponse(403, {
      errors: [{ status: '403', code: 'FORBIDDEN', title: 'No tenés permiso para borrar fotos' }],
    });
  }

  const key = new URL(request.url).searchParams.get('key');
  if (!isValidFotoKey(key)) {
    return errorResponse(422, {
      errors: [
        {
          status: '422',
          code: 'INVALID_PARAM',
          title: 'Parámetro inválido',
          detail: 'La key de la foto no es válida',
          source: { pointer: 'key' },
        },
      ],
    });
  }

  if (await isFotoKeyEnUso(key)) {
    return errorResponse(409, {
      errors: [
        {
          status: '409',
          code: 'FOTO_EN_USO',
          title: 'La foto está asignada a un deportista y no se puede descartar',
        },
      ],
    });
  }

  await deleteFoto(key);
  return new Response(null, { status: 204 });
}
