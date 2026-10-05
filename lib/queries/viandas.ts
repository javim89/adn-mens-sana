import { prisma } from '@/lib/db';
import { fechaDbDesdeClave } from '@/lib/utils/fecha';
import { recibeMerienda } from '@/lib/utils/viandas';
import type { DeportistaVianda, EntregaView } from '@/lib/types/viandas';

/**
 * Plantel de una disciplina+categoría con las entregas del día `fecha`
 * (`'YYYY-MM-DD'` en la zona del club).
 *
 * Dos consultas y merge en JS en vez de un `include`: las entregas se filtran por
 * fecha, y un `include` anidado con ese `where` obliga a Prisma a un join que
 * devuelve una fila por comida por deportista.
 */
export async function getPlantelViandas(
  disciplinaId: string,
  categoriaId: string,
  fecha: string,
): Promise<DeportistaVianda[]> {
  // SIN filtro de `estado`: un LESIONADO o SUSPENDIDO sigue comiendo. Mismo
  // criterio que `getDeportistasParaConvocar`, no el de presentismo.
  const deportistas = await prisma.deportista.findMany({
    where: { disciplinaId, categoriaId },
    select: {
      id: true,
      apellido: true,
      nombre: true,
      estado: true,
      necesidadesApoyo: { select: { recibeAlmuerzo: true, recibeCena: true } },
      // Todos comparten la categoría del filtro, pero se lee por fila para que
      // la regla de merienda viva en un solo lugar (`recibeMerienda`).
      categoria: { select: { nombre: true } },
    },
    orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
  });

  if (deportistas.length === 0) return [];

  const entregas = await prisma.entregaComida.findMany({
    where: {
      fecha: fechaDbDesdeClave(fecha),
      deportistaId: { in: deportistas.map((d) => d.id) },
    },
    select: {
      deportistaId: true,
      comida: true,
      lugar: true,
      entregadoPor: true,
      createdAt: true,
    },
  });

  const porDeportista = new Map<string, Partial<Record<string, EntregaView>>>();
  for (const e of entregas) {
    const acc = porDeportista.get(e.deportistaId) ?? {};
    acc[e.comida] = {
      lugar: e.lugar,
      entregadoPor: e.entregadoPor,
      createdAt: e.createdAt.toISOString(),
    };
    porDeportista.set(e.deportistaId, acc);
  }

  return deportistas.map((d) => ({
    id: d.id,
    apellido: d.apellido,
    nombre: d.nombre,
    estado: d.estado,
    // Satélite ausente = no recibe ni almuerzo ni cena.
    recibeAlmuerzo: d.necesidadesApoyo?.recibeAlmuerzo ?? false,
    recibeCena: d.necesidadesApoyo?.recibeCena ?? false,
    recibeMerienda: recibeMerienda(d.categoria?.nombre),
    entregas: porDeportista.get(d.id) ?? {},
  }));
}
