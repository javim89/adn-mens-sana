import { prisma } from '@/lib/db';
import { Prisma } from '@/lib/generated/prisma/client';
import type { NivelTriage } from '@/lib/generated/prisma/enums';

/**
 * `triage` es una tabla append-only de snapshots: cada recálculo agrega una fila.
 * El nivel "actual" es la última fila por deportista, algo que no se puede expresar
 * con un `where` de relación de Prisma, así que va en SQL crudo con `DISTINCT ON`
 * (mismo patrón que el dataset `triage_ultimo` de insights, y aprovecha el índice
 * `(deportista_id, calculated_at)`).
 */
export async function getNivelTriageActual(
  deportistaIds?: string[],
): Promise<Map<string, NivelTriage>> {
  // `Prisma.join([])` lanza error, y un filtro vacío no tiene resultados posibles.
  if (deportistaIds && deportistaIds.length === 0) {
    return new Map();
  }

  const whereClause = deportistaIds
    ? Prisma.sql`WHERE triage.deportista_id IN (${Prisma.join(deportistaIds)})`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<{ deportista_id: string; nivel: NivelTriage }[]>(
    Prisma.sql`
      SELECT DISTINCT ON (triage.deportista_id)
        triage.deportista_id,
        triage.nivel
      FROM triage
      ${whereClause}
      ORDER BY triage.deportista_id, triage.calculated_at DESC
    `,
  );

  return new Map(rows.map((row) => [row.deportista_id, row.nivel]));
}
