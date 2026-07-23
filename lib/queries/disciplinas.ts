import { prisma } from '@/lib/db';

export interface DisciplinaConCategorias {
  id: string;
  nombre: string;
  categorias: { id: string; nombre: string }[];
}

export async function getDisciplinasConCategorias(): Promise<DisciplinaConCategorias[]> {
  const rows = await prisma.disciplina.findMany({
    orderBy: { orden: 'asc' },
    select: {
      id: true,
      nombre: true,
      categorias: {
        orderBy: { categoria: { orden: 'asc' } },
        select: { categoria: { select: { id: true, nombre: true } } },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    nombre: row.nombre,
    categorias: row.categorias.map((c) => c.categoria),
  }));
}
