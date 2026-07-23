import { auth } from '@clerk/nextjs/server';
import { getDisciplinasConCategorias } from '@/lib/queries/disciplinas';
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

  const disciplinas = await getDisciplinasConCategorias();

  const responseBody = {
    data: disciplinas.map((d) => ({
      type: 'disciplinas' as const,
      id: d.id,
      attributes: { nombre: d.nombre, categorias: d.categorias },
    })),
    meta: { total: disciplinas.length },
  };

  return new Response(JSON.stringify(responseBody), {
    status: 200,
    headers: { 'Content-Type': JSON_API_CONTENT_TYPE },
  });
}
