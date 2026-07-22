import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import type {
  Disciplina,
  EstadoDeportista,
} from '@/lib/generated/prisma/enums';
import type { DeportistaListItem, DeportistaWithRelations } from '@/lib/types/deportistas';

export interface GetDeportistasFilters {
  search?: string;
  disciplina?: Disciplina;
  categoriaId?: string;
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
  const { search, disciplina, categoriaId, estado, page = 1, pageSize = 20 } = filters;

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
    ...(categoriaId ? { categoriaId } : {}),
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
        categoriaId: true,
        categoria: { select: { id: true, nombre: true } },
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
      categoria: { select: { id: true, nombre: true } },
      clubesAnteriores: true,
      historiaDeportiva: true,
      datosEscolares: true,
      datosSociales: true,
      viviendaFamiliar: { include: { servicios: true } },
      datosFamiliares: true,
      necesidadesApoyo: { include: { apoyosRequeridos: true } },
      datosSalud: {
        include: {
          enfermedadesPreexistentes: true,
          antecedentesEnfermedadesFam: true,
        },
      },
    },
  });

  if (!deportista) {
    notFound();
  }

  return deportista as DeportistaWithRelations;
}
