import type { Metadata } from 'next';
import { getCalendarioData } from '@/lib/queries/calendario';
import { getProximosEventos } from '@/lib/queries/dashboard';
import { requireContexto } from '@/lib/tenant/contexto';
import { fechaDbDesdeClave, hoyEnArgentina } from '@/lib/utils/fecha';
import CalendarioView from './_components/CalendarioView';
import ProximosPartidos from './_components/ProximosPartidos';

export const metadata: Metadata = { title: 'Calendario' };

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string | string[] }>;
}) {
  await requireContexto();
  const [{ categorias, dias, eventos }, sp] = await Promise.all([getCalendarioData(), searchParams]);

  const pedida = Array.isArray(sp.categoria) ? sp.categoria[0] : sp.categoria;
  const categoriaId = categorias.some((c) => c.id === pedida) ? (pedida as string) : null;

  const hoy = hoyEnArgentina();
  const proximos = await getProximosEventos({
    desdeHoyDb: fechaDbDesdeClave(hoy),
    limite: 5,
    categoriaId: categoriaId ?? undefined,
  });

  return (
    <div className="p-4 md:p-8 min-w-0">
      <CalendarioView
        categorias={categorias}
        dias={dias}
        eventos={eventos}
        hoy={hoy}
        categoriaId={categoriaId}
        lateral={<ProximosPartidos eventos={proximos} />}
      />
    </div>
  );
}
