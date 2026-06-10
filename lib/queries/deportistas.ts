import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import type {
  Disciplina,
  Categoria,
  EstadoDeportista,
} from '@/lib/generated/prisma/enums';
import type { DeportistaListItem, DeportistaWithRelations } from '@/lib/types/deportistas';

export interface GetDeportistasFilters {
  search?: string;
  disciplina?: Disciplina;
  categoria?: Categoria;
  estado?: EstadoDeportista;
  page?: number;
  pageSize?: number;
}

export interface GetDeportistasResult {
  deportistas: DeportistaListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getDeportistas(
  filters: GetDeportistasFilters = {},
): Promise<GetDeportistasResult> {
  const { search, disciplina, categoria, estado, page = 1, pageSize = 20 } = filters;

  const where = {
    ...(search
      ? {
          OR: [
            { nombre: { contains: search, mode: 'insensitive' as const } },
            { apellido: { contains: search, mode: 'insensitive' as const } },
            { dni: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(disciplina ? { disciplina } : {}),
    ...(categoria ? { categoria } : {}),
    ...(estado ? { estado } : {}),
  };

  const [deportistas, total] = await Promise.all([
    prisma.deportista.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        apellido: true,
        dni: true,
        disciplina: true,
        categoria: true,
        estado: true,
        fechaIngreso: true,
      },
      orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.deportista.count({ where }),
  ]);

  return { deportistas, total, page, pageSize };
}

export async function getDeportistaById(id: string): Promise<DeportistaWithRelations> {
  const deportista = await prisma.deportista.findUnique({
    where: { id },
    include: {
      clubesAnteriores: true,
      historiaDeportiva: true,
      datosEscolares: true,
      datosSociales: true,
      viviendaFamiliar: { include: { servicios: true } },
      datosFamiliares: true,
      necesidadesApoyo: { include: { apoyosRequeridos: true } },
    },
  });

  if (!deportista) {
    notFound();
  }

  return deportista as DeportistaWithRelations;
}
