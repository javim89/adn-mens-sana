import type { Prisma } from '@/lib/generated/prisma/client';
import type { NivelTriage } from '@/lib/generated/prisma/enums';
import type { DbClub } from '@/lib/tenant/db';
import { computeTriage } from '@/lib/triage/rules';
import { getAllTriageInputs, getTriageInput } from '@/lib/triage/data';
import type { TriageResult } from '@/lib/types/triage';

function toRow(deportistaId: string, result: TriageResult): Prisma.TriageCreateManyInput {
  return {
    deportistaId,
    nivel: result.nivel,
    puntajeTotal: result.puntajeTotal,
    desglose: result.desglose as unknown as Prisma.InputJsonValue,
  };
}

/** `db` decide el club: `getDb()` en una request, `dbDelClub(id)` en el cron. */
export async function recomputeOne(
  db: DbClub,
  deportistaId: string,
  now: Date = new Date(),
): Promise<TriageResult> {
  const input = await getTriageInput(db, deportistaId, now);
  const result = computeTriage(input);
  await db.triage.create({ data: toRow(deportistaId, result) });
  return result;
}

export async function recomputeAll(
  db: DbClub,
  now: Date = new Date(),
): Promise<{ procesados: number; byNivel: Record<NivelTriage, number> }> {
  const inputs = await getAllTriageInputs(db, now);

  const byNivel: Record<NivelTriage, number> = {
    VERDE: 0,
    AMARILLO: 0,
    NARANJA: 0,
    ROJO: 0,
  };

  const rows: Prisma.TriageCreateManyInput[] = inputs.map(({ deportistaId, input }) => {
    const result = computeTriage(input);
    byNivel[result.nivel] += 1;
    return toRow(deportistaId, result);
  });

  if (rows.length > 0) {
    await db.triage.createMany({ data: rows });
  }

  return { procesados: rows.length, byNivel };
}
