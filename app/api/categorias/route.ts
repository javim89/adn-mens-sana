import { auth } from '@clerk/nextjs/server';
import { getCategorias } from '@/lib/queries/categorias';
import type { JsonApiErrors } from '@/lib/types/jsonapi';

const JSON_API_CONTENT_TYPE = 'application/vnd.api+json';

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    const body: JsonApiErrors = {
      errors: [{ status: '401', code: 'UNAUTHENTICATED', title: 'No autorizado' }],
    };
    return new Response(JSON.stringify(body), {
      status: 401,
      headers: { 'Content-Type': JSON_API_CONTENT_TYPE },
    });
  }

  const categorias = await getCategorias();

  const responseBody = {
    data: categorias.map((c) => ({
      type: 'categorias' as const,
      id: c.id,
      attributes: { nombre: c.nombre, orden: c.orden },
    })),
    meta: { total: categorias.length },
  };

  return new Response(JSON.stringify(responseBody), {
    status: 200,
    headers: { 'Content-Type': JSON_API_CONTENT_TYPE },
  });
}
