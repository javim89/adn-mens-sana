import { prisma } from '@/lib/db';
import { dbDelClub } from '@/lib/tenant/db';
import { limpiarSesionesInsightsVencidas } from '@/lib/tenant/insights-sesion';
import { recomputeAll } from '@/lib/triage/recompute';

type ResultadoClub =
  | { clubId: string; ok: true; procesados: number; byNivel: Awaited<ReturnType<typeof recomputeAll>>['byNivel'] }
  | { clubId: string; ok: false; error: string };

/**
 * Recalcula el triage de todos los clubes activos.
 *
 * Corre sin sesión (lo invoca una scheduled function con `CRON_SECRET`), así que
 * no hay club activo: recorre los clubes con el cliente base y procesa cada uno
 * con su propio `dbDelClub(club.id)`. Un club que falla no frena al resto; el
 * error queda en su entrada del resultado y la respuesta es 500 si falló alguno,
 * para que el scheduler lo registre.
 *
 * De paso borra los tokens vencidos de `insights_sesiones` (viven 60 s; las RLS
 * ya los ignoran, esto es solo limpieza). Si falla, se loguea y no afecta el
 * status: el triage es lo que importa.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('Authorization');

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const clubes = await prisma.club.findMany({
    where: { activo: true },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });

  const now = new Date();
  const clubesResultado: ResultadoClub[] = [];
  for (const club of clubes) {
    try {
      const { procesados, byNivel } = await recomputeAll(dbDelClub(club.id), now);
      clubesResultado.push({ clubId: club.id, ok: true, procesados, byNivel });
    } catch (error) {
      console.error(`cron triage: falló el club ${club.id}:`, error);
      clubesResultado.push({
        clubId: club.id,
        ok: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }

  let sesionesInsightsBorradas = 0;
  try {
    sesionesInsightsBorradas = await limpiarSesionesInsightsVencidas(now);
  } catch (error) {
    console.error('cron triage: falló la limpieza de insights_sesiones:', error);
  }

  const procesados = clubesResultado.reduce((total, r) => total + (r.ok ? r.procesados : 0), 0);
  const fallidos = clubesResultado.filter((r) => !r.ok).length;

  return new Response(JSON.stringify({ procesados, clubes: clubesResultado, sesionesInsightsBorradas }), {
    status: fallidos > 0 ? 500 : 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
