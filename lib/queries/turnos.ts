import { prisma } from '@/lib/db';

export async function getTurnos(params: { profesionalId?: string } = {}) {
  return prisma.turno.findMany({
    where: params.profesionalId ? { profesionalId: params.profesionalId } : {},
    include: {
      deportistas: {
        include: {
          deportista: { select: { id: true, nombre: true, apellido: true } },
        },
      },
    },
    orderBy: [{ fecha: 'asc' }, { hora: 'asc' }],
  });
}

export async function getTurnoById(id: string) {
  return prisma.turno.findUnique({
    where: { id },
    include: {
      deportistas: {
        include: {
          deportista: { select: { id: true, nombre: true, apellido: true } },
        },
      },
    },
  });
}
