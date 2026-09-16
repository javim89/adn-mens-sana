/**
 * POST /api/insights/query — ejecuta un QuerySpec del builder o SQL crudo.
 *
 * Es route handler y no server action a propósito: el editor hace preview con
 * debounce y el dashboard resuelve N widgets en paralelo, y eso lo resuelve
 * TanStack Query (caché, dedupe, invalidación) del lado del cliente.
 *
 * API interna: JSON plano, no JSON:API.
 */

import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { runQuery, runRawSql } from '@/lib/insights/run';
import { formatZodError, queryRequestSchema } from '@/lib/insights/schemas';
import type { ColumnMeta, Row } from '@/lib/insights/types';

export const dynamic = 'force-dynamic';

/** Tope del payload serializado. Más que esto no lo dibuja ningún chart. */
const MAX_PAYLOAD_BYTES = 2 * 1024 * 1024;

function errorResponse(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/**
 * Los errores del compilador y del guard son errores del usuario (400); los de
 * Postgres son fallas del servidor (500) y su detalle no sale de acá.
 */
function isDatabaseError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const name = (error as { name?: unknown }).name;
  return typeof name === 'string' && name.startsWith('PrismaClient');
}

/**
 * Corta filas hasta que el payload entra en el tope. Se estima el tamaño por
 * fila del stringify completo en vez de serializar en cada iteración.
 */
function fitPayload(rows: Row[]): { rows: Row[]; truncated: boolean } {
  let current = rows;
  for (let attempt = 0; attempt < 4; attempt++) {
    const bytes = Buffer.byteLength(JSON.stringify(current), 'utf8');
    if (bytes <= MAX_PAYLOAD_BYTES || current.length <= 1) {
      return { rows: current, truncated: current.length < rows.length };
    }
    const perRow = Math.max(1, Math.ceil(bytes / current.length));
    const fit = Math.max(1, Math.floor(MAX_PAYLOAD_BYTES / perRow));
    current = current.slice(0, Math.min(fit, current.length - 1));
  }
  return { rows: current, truncated: true };
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return errorResponse(401, 'No autorizado');

  const user = await currentUser();
  if (user?.publicMetadata?.role !== 'admin') {
    return errorResponse(403, 'Acceso denegado: se requiere rol admin');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'Cuerpo inválido: se esperaba JSON');
  }

  const parsed = queryRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, formatZodError(parsed.error));
  }

  const { spec } = parsed.data;
  const startedAt = Date.now();

  let result: { columns: ColumnMeta[]; rows: Record<string, unknown>[] };
  try {
    result = spec.mode === 'builder' ? await runQuery(spec) : await runRawSql(spec.sql);
  } catch (error) {
    if (isDatabaseError(error)) {
      console.error('POST /api/insights/query error:', error);
      return errorResponse(500, 'Error al ejecutar la consulta en la base de datos');
    }
    return errorResponse(
      400,
      error instanceof Error ? error.message : 'No se pudo ejecutar la consulta',
    );
  }

  const { rows, truncated } = fitPayload(result.rows as Row[]);

  return NextResponse.json({
    data: rows,
    columns: result.columns,
    meta: {
      rowCount: rows.length,
      truncated,
      elapsedMs: Date.now() - startedAt,
    },
  });
}
