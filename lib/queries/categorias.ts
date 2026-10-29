import { getDb } from '@/lib/tenant/db';

export interface CategoriaCatalogo {
  id: string;
  nombre: string;
  orden: number;
}

export async function getCategorias(): Promise<CategoriaCatalogo[]> {
  const db = await getDb();
  return db.categoria.findMany({
    select: { id: true, nombre: true, orden: true },
    orderBy: { orden: 'asc' },
  });
}
