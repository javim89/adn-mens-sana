import { redirect } from 'next/navigation';
import { currentUser, clerkClient } from '@clerk/nextjs/server';
import { getDisciplinasConCategorias } from '@/lib/queries/disciplinas';
import { getPlantelViandas } from '@/lib/queries/viandas';
import { hoyEnArgentina, resolverFechaActiva } from '@/lib/utils/fecha';
import { esFiltroComida, esLugarRetiro } from '@/lib/utils/viandas';
import ViandasPanel from './_components/ViandasPanel';
import type { DeportistaVianda } from '@/lib/types/viandas';

export const dynamic = 'force-dynamic';

// Mismo patrón que convocatorias/presentismo: el guard vive en la page porque
// `proxy.ts` solo exige sesión, no rol. Las actions lo revalidan por su cuenta.
const ROLES_VIANDAS = ['admin', 'responsable_viandas'];

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function ViandasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const user = await currentUser();
  const role = String(user?.publicMetadata?.role ?? '');
  if (!ROLES_VIANDAS.includes(role)) redirect('/dashboard');

  const isAdmin = role === 'admin';
  const metaLugar = (user?.publicMetadata as Record<string, unknown> | undefined)?.lugarRetiro;
  const lugarResponsable = esLugarRetiro(metaLugar) ? metaLugar : null;

  // El admin elige el lugar por la URL; el responsable lo tiene fijado en su
  // perfil y no puede cambiarlo. El servidor vuelve a decidirlo al marcar, así
  // que esto es solo para que la UI sepa qué mostrar.
  const lugarUrl = firstParam(sp.lugar);
  const lugarActivo = isAdmin
    ? esLugarRetiro(lugarUrl)
      ? lugarUrl
      : null
    : lugarResponsable;

  const disciplinaId = firstParam(sp.disciplina) || undefined;
  const categoriaId = firstParam(sp.categoria) || undefined;
  // Un valor inválido cae a "todas" en vez de vaciar la grilla.
  const comidaUrl = firstParam(sp.comida);
  const filtroComida = esFiltroComida(comidaUrl) ? comidaUrl : null;

  const fechaHoy = hoyEnArgentina();

  // Histórico: SOLO admin, nunca futura, degrada a hoy. Las tres reglas viven en
  // `resolverFechaActiva` — el gate es server-side, no un `hidden` en el cliente.
  const fechaActiva = resolverFechaActiva(isAdmin, sp.fecha, fechaHoy);

  // Se exigen AMBOS filtros, como el form de convocatoria: con solo disciplina
  // serían cientos de filas por cuatro comidas y los contadores dejarían de
  // decir algo operativo.
  const plantel: DeportistaVianda[] =
    disciplinaId && categoriaId
      ? await getPlantelViandas(disciplinaId, categoriaId, fechaActiva)
      : [];

  // Nombres de quienes entregaron, para que el subtexto de cada celda marcada
  // diga quién fue y no un id de Clerk.
  const entregadores: Record<string, string> = {};
  const ids = [
    ...new Set(
      plantel.flatMap((d) => Object.values(d.entregas).map((e) => e!.entregadoPor)),
    ),
  ];
  if (ids.length > 0) {
    const client = await clerkClient();
    const users = await Promise.all(
      ids.map((id) => client.users.getUser(id).catch(() => null)),
    );
    for (const u of users) {
      if (!u) continue;
      const meta = (u.publicMetadata ?? {}) as Record<string, unknown>;
      const nombre = u.firstName || String(meta.firstName ?? '');
      const apellido = u.lastName || String(meta.lastName ?? '');
      entregadores[u.id] =
        `${nombre} ${apellido}`.trim() || u.emailAddresses?.[0]?.emailAddress || u.id;
    }
  }

  const disciplinas = await getDisciplinasConCategorias();

  return (
    <ViandasPanel
      fechaHoy={fechaHoy}
      fechaActiva={fechaActiva}
      isAdmin={isAdmin}
      lugarActivo={lugarActivo}
      sinLugarAsignado={!isAdmin && !lugarResponsable}
      disciplinas={disciplinas}
      disciplinaId={disciplinaId ?? ''}
      categoriaId={categoriaId ?? ''}
      filtroComida={filtroComida}
      plantel={plantel}
      entregadores={entregadores}
    />
  );
}
