import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import type { EstadoDeportista, NivelTriage } from '@/lib/generated/prisma/enums';
import type { Prisma } from '@/lib/generated/prisma/client';
import { getNivelTriageActual } from '@/lib/queries/triage';
import type { DeportistaListItem, DeportistaWithRelations } from '@/lib/types/deportistas';

export interface GetDeportistasFilters {
  search?: string;
  disciplinaId?: string;
  categoriaId?: string;
  estado?: EstadoDeportista;
  nivelTriage?: NivelTriage | 'SIN_CALCULAR';
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
  const { search, disciplinaId, categoriaId, estado, nivelTriage, page = 1, pageSize = 20 } = filters;

  // Con filtro de triage hay que resolver los niveles ANTES de paginar, para que
  // el `count` y el `findMany` compartan el mismo `where` y el total sea correcto.
  const nivelPorDeportista = nivelTriage ? await getNivelTriageActual() : null;

  const filtroTriage: Prisma.DeportistaWhereInput = !nivelPorDeportista
    ? {}
    : nivelTriage === 'SIN_CALCULAR'
      ? { id: { notIn: [...nivelPorDeportista.keys()] } }
      : {
          id: {
            in: [...nivelPorDeportista.entries()]
              .filter(([, nivel]) => nivel === nivelTriage)
              .map(([id]) => id),
          },
        };

  const where: Prisma.DeportistaWhereInput = {
    ...(search
      ? {
          OR: [
            { nombre: { contains: search, mode: 'insensitive' as const } },
            { apellido: { contains: search, mode: 'insensitive' as const } },
            { dni: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(disciplinaId ? { disciplinaId } : {}),
    ...(categoriaId ? { categoriaId } : {}),
    ...(estado ? { estado } : {}),
    ...filtroTriage,
  };

  const [rows, total] = await Promise.all([
    prisma.deportista.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        apellido: true,
        dni: true,
        disciplinaId: true,
        disciplina: { select: { id: true, nombre: true } },
        categoriaId: true,
        categoria: { select: { id: true, nombre: true } },
        estado: true,
      },
      orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.deportista.count({ where }),
  ]);

  const niveles = nivelPorDeportista ?? (await getNivelTriageActual(rows.map((d) => d.id)));

  const deportistas: DeportistaListItem[] = rows.map((d) => ({
    ...d,
    nivelTriage: niveles.get(d.id) ?? null,
  }));

  return { deportistas, total, page, pageSize };
}

export async function getDeportistaById(id: string): Promise<DeportistaWithRelations> {
  const deportista = await prisma.deportista.findUnique({
    where: { id },
    include: {
      disciplina: { select: { id: true, nombre: true } },
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
