import type { Prisma } from '@/lib/generated/prisma/client';
import type { NivelTriage } from '@/lib/generated/prisma/enums';
import { prisma } from '@/lib/db';
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

export async function recomputeOne(
  deportistaId: string,
  now: Date = new Date(),
): Promise<TriageResult> {
  const input = await getTriageInput(deportistaId, now);
  const result = computeTriage(input);
  await prisma.triage.create({ data: toRow(deportistaId, result) });
  return result;
}

export async function recomputeAll(
  now: Date = new Date(),
): Promise<{ procesados: number; byNivel: Record<NivelTriage, number> }> {
  const inputs = await getAllTriageInputs(now);

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
    await prisma.triage.createMany({ data: rows });
  }

  return { procesados: rows.length, byNivel };
}
