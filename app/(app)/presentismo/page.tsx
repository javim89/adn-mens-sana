import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { EncabezadoPagina } from '@/app/components/ui/encabezado-pagina';
import { Rotulo } from '@/app/components/ui/panel';
import { requireContexto } from '@/lib/tenant/contexto';
import type { AppRole } from '@/lib/roles';
import { getEntrenamientos } from '@/lib/queries/presentismo';
import { getDisciplinasConCategorias } from '@/lib/queries/disciplinas';
import { getResumenPresentismo } from '@/lib/queries/dashboard';
import { semanaActual, semanaAnterior } from '@/lib/utils/fecha';
import { TIPO_SESION_LABELS } from '@/lib/utils/asistencia';
import type { TipoSesion } from '@/lib/types/presentismo';
import { rangoSemana } from '../dashboard/_lib/formato';
import PresentismoTable, { type EntrenamientoListItem } from './_components/PresentismoTable';
import EstadisticasSemana from './_components/EstadisticasSemana';
import FiltrosPresentismo from './_components/FiltrosPresentismo';

export const metadata: Metadata = { title: 'Presentismo' };

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;
const ROLES_PERMITIDOS: AppRole[] = ['admin', 'entrenador'];

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function esTipoSesion(v: string | undefined): v is TipoSesion {
  return !!v && v in TIPO_SESION_LABELS;
}

export default async function PresentismoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { userId, rol: role } = await requireContexto(ROLES_PERMITIDOS);

  const isAdmin = role === 'admin';

  const pageRaw = parseInt(firstParam(sp.page) ?? '', 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 0;

  const disciplinas = await getDisciplinasConCategorias();

  const disciplinaId = firstParam(sp.disciplina) || undefined;
  // Una categoría que no es de la disciplina elegida no filtra: vaciaría todo sin explicar por qué.
  const categoriaUrl = firstParam(sp.categoria) || undefined;
  const categoriaId =
    disciplinaId &&
    disciplinas.find((d) => d.id === disciplinaId)?.categorias.some((c) => c.id === categoriaUrl)
      ? categoriaUrl
      : undefined;
  const tipoUrl = firstParam(sp.tipo);
  const tipoSesion = esTipoSesion(tipoUrl) ? tipoUrl : undefined;

  const semana = semanaActual();
  const semanaPrevia = semanaAnterior();

  const [{ items, total }, resumen] = await Promise.all([
    getEntrenamientos({
      page,
      pageSize: PAGE_SIZE,
      disciplinaId,
      categoriaId,
      tipoSesion,
      callerId: userId,
      isAdmin,
    }),
    getResumenPresentismo({
      rango: { desdeDb: semana.desdeDb, finExclusivoDb: semana.finExclusivoDb },
      rangoPrevio: { desdeDb: semanaPrevia.desdeDb, finExclusivoDb: semanaPrevia.finExclusivoDb },
      entrenadorId: isAdmin ? undefined : userId,
      disciplinaId,
      categoriaId,
    }),
  ]);

  const serialized: EntrenamientoListItem[] = items.map((e) => ({
    id: e.id,
    fecha: e.fecha.toISOString().split('T')[0],
    disciplinaNombre: e.disciplina.nombre,
    categoriaNombre: e.categoria.nombre,
    tipoSesion: e.tipoSesion,
    totalAsistencias: e._count.asistencias,
    presentes: e.presentes,
  }));

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <EncabezadoPagina
        titulo="Presentismo"
        contador={total}
        contadorLabel={`${total} ${total === 1 ? 'entrenamiento' : 'entrenamientos'}`}
        subtitulo={`Semana ${rangoSemana(semana.desdeClave, semana.hastaClave)}`}
        accion={
          <Button asChild>
            <Link href="/presentismo/nuevo">
              <Plus aria-hidden />
              Nuevo entrenamiento
            </Link>
          </Button>
        }
      >
        <FiltrosPresentismo
          disciplinas={disciplinas}
          disciplinaId={disciplinaId ?? null}
          categoriaId={categoriaId ?? null}
          tipoSesion={tipoSesion ?? null}
        />
      </EncabezadoPagina>

      <EstadisticasSemana datos={resumen} />

      <section aria-labelledby="presentismo-entrenamientos" className="flex flex-col gap-3">
        <Rotulo como="h2" id="presentismo-entrenamientos">
          Entrenamientos
        </Rotulo>
        <PresentismoTable items={serialized} total={total} page={page} pageSize={PAGE_SIZE} />
      </section>
    </div>
  );
}
