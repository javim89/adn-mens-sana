import { prisma } from '@/lib/db';

export interface CategoriaCatalogo {
  id: string;
  nombre: string;
  orden: number;
}

export async function getCategorias(): Promise<CategoriaCatalogo[]> {
  return prisma.categoria.findMany({
    select: { id: true, nombre: true, orden: true },
    orderBy: { orden: 'asc' },
  });
}
