import { contextoApi } from '@/lib/tenant/contexto';
import { getDisciplinasConCategorias } from '@/lib/queries/disciplinas';

const JSON_API_CONTENT_TYPE = 'application/vnd.api+json';

export async function GET() {
  const acceso = await contextoApi();
  if (!acceso.ok) return acceso.response;

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
