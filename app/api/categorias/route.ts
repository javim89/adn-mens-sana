import { contextoApi } from '@/lib/tenant/contexto';
import { getCategorias } from '@/lib/queries/categorias';

const JSON_API_CONTENT_TYPE = 'application/vnd.api+json';

export async function GET() {
  const acceso = await contextoApi();
  if (!acceso.ok) return acceso.response;

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
