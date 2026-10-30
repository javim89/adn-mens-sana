import type { Metadata } from 'next';
import { requireContexto } from '@/lib/tenant/contexto';
import { getNombresDeUsuarios } from '@/lib/tenant/miembros';
import type { AppRole } from '@/lib/roles';
import { getDisciplinasConCategorias } from '@/lib/queries/disciplinas';
import { getPlantelViandas } from '@/lib/queries/viandas';
import { hoyEnArgentina, resolverFechaActiva } from '@/lib/utils/fecha';
import { esFiltroComida, esLugarRetiro } from '@/lib/utils/viandas';
import ViandasPanel from './_components/ViandasPanel';
import type { DeportistaVianda } from '@/lib/types/viandas';

export const metadata: Metadata = { title: 'Viandas' };

export const dynamic = 'force-dynamic';

// Mismo patrón que convocatorias/presentismo: el guard vive en la page porque
// `proxy.ts` solo exige sesión, no rol. Las actions lo revalidan por su cuenta.
const ROLES_VIANDAS: AppRole[] = ['admin', 'responsable_viandas'];

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
  const { rol, lugarRetiro } = await requireContexto(ROLES_VIANDAS);

  const isAdmin = rol === 'admin';
  const lugarResponsable = lugarRetiro;

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
  const ids = plantel.flatMap((d) => Object.values(d.entregas).map((e) => e!.entregadoPor));
  const entregadores = ids.length > 0 ? await getNombresDeUsuarios(ids) : {};

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
