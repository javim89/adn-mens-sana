/**
 * DELETE /api/club/logo?key=… — borra un logo recién subido que no se llegó a
 * guardar (el PUT a S3 anduvo pero `guardarConfiguracionClub` falló). Lo llama el
 * form de `/configuracion` como limpieza best-effort. Solo admin.
 *
 * Solo borra keys subidas para el club de la sesión (`clubes/<clubId>/logo/<uuid>.png`)
 * y nunca el logo vigente del club ni la key legacy.
 */

import { contextoApi } from '@/lib/tenant/contexto';
import { deleteFoto, keyLogoBorrable } from '@/lib/s3';
import type { JsonApiErrors } from '@/lib/types/jsonapi';

function errorResponse(status: number, code: string, title: string): Response {
  const body: JsonApiErrors = { errors: [{ status: String(status), code, title }] };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/vnd.api+json' },
  });
}

export async function DELETE(request: Request) {
  const acceso = await contextoApi(['admin']);
  if (!acceso.ok) return acceso.response;
  const { clubId, club } = acceso.contexto;

  const key = new URL(request.url).searchParams.get('key');
  if (!keyLogoBorrable(key, clubId)) return errorResponse(422, 'INVALID_KEY', 'El logo no es válido');
  if (key === club.logoKey) return errorResponse(409, 'LOGO_VIGENTE', 'Es el logo actual del club');

  await deleteFoto(key);
  return new Response(null, { status: 204 });
}
