import Link from 'next/link';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Avatar } from '@/app/components/ui/avatar';
import { Button } from '@/app/components/ui/button';
import { getDeportistaById } from '@/lib/queries/deportistas';
import { getConteoSeguimientosDeportista, getSeguimientos } from '@/lib/queries/seguimientos';
import { getTrayectoria } from '@/lib/queries/trayectoria';
import { getTriageDeportista } from '@/lib/queries/triage';
import { getDisciplinasConCategorias } from '@/lib/queries/disciplinas';
import { getCategorias } from '@/lib/queries/categorias';
import { requireContexto } from '@/lib/tenant/contexto';
import { getFotoUrl } from '@/lib/s3';
import {
  ESTADO_BADGE,
  ESTADO_LABELS,
  NIVEL_TRIAGE_BADGE,
  NIVEL_TRIAGE_LABELS,
} from '@/lib/utils/enum-labels';
import DeportistaDetailTabs from '../_components/DeportistaDetailTabs';
import DeleteDeportistaModal from '../_components/DeleteDeportistaModal';
import { calcEdad } from '../_components/DeportistaDetail';
import { subtituloFicha } from '../_lib/ficha';

const BADGE = 'inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap';

export default async function DeportistaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Antes de cualquier query: sin club, a /bienvenida (y no un SinContextoError).
  await requireContexto();
  const deportista = await getDeportistaById(id);

  const [{ items: seguimientosRaw }, fotoUrl, seguimientosTotal, triageDeportista] = await Promise.all([
    getSeguimientos({ deportistaId: id, pageSize: 500 }),
    getFotoUrl(deportista.fotoKey),
    getConteoSeguimientosDeportista(id),
    getTriageDeportista(id),
  ]);
  const seguimientos = seguimientosRaw.map((s) => ({
    id: s.id,
    fecha: s.fecha.toISOString().split('T')[0],
    titulo: s.titulo,
    descripcion: s.descripcion,
    prioridad: s.prioridad,
    proximaCita: s.proximaCita?.toISOString() ?? null,
    tipoSeguimiento: s.tipoSeguimiento ?? null,
  }));

  const [{ periodos, eventos }, disciplinasCatalogo, categoriasCatalogo] =
    await Promise.all([getTrayectoria(id), getDisciplinasConCategorias(), getCategorias()]);
  const disciplinas = disciplinasCatalogo.map((d) => ({ id: d.id, nombre: d.nombre }));
  const categorias = categoriasCatalogo.map((c) => ({ id: c.id, nombre: c.nombre }));

  const triage = triageDeportista
    ? {
        nivel: triageDeportista.nivel,
        puntajeTotal: triageDeportista.puntaje,
        desglose: triageDeportista.desglose,
        calculatedAt: triageDeportista.calculatedAt,
      }
    : null;

  const nombreCompleto = `${deportista.apellido}, ${deportista.nombre}`;
  const subtitulo = subtituloFicha({
    disciplina: deportista.disciplina?.nombre,
    categoria: deportista.categoria?.nombre,
    posicion: deportista.posicion,
    edad: calcEdad(deportista.fechaNacimiento),
  });

  return (
    <div className="p-4 md:p-8">
      <Link
        href="/deportistas"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Deportistas
      </Link>

      <div className="mt-2 mb-6 flex flex-wrap items-center gap-3 sm:gap-4">
        <Avatar
          src={fotoUrl}
          alt={nombreCompleto}
          iniciales={`${deportista.nombre.charAt(0)}${deportista.apellido.charAt(0)}`}
          className="size-16 text-xl sm:size-20 sm:text-2xl"
        />
        <div className="min-w-0 flex-1">
          <h1 className="min-w-0 break-words font-[family-name:var(--font-oswald)] text-2xl font-bold text-primario md:text-3xl">
            {nombreCompleto}
          </h1>
          {subtitulo && <p className="text-sm text-muted-foreground">{subtitulo}</p>}
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className={`${BADGE} ${ESTADO_BADGE[deportista.estado]}`}>
              {ESTADO_LABELS[deportista.estado]}
            </span>
            {triage && (
              <span className={`${BADGE} ${NIVEL_TRIAGE_BADGE[triage.nivel]}`}>
                Triage {NIVEL_TRIAGE_LABELS[triage.nivel]}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/deportistas/${id}/editar`}>
              <Pencil aria-hidden />
              Editar
            </Link>
          </Button>
          <DeleteDeportistaModal deportistaId={deportista.id} deportistaNombre={nombreCompleto} />
        </div>
      </div>

      <DeportistaDetailTabs
        deportista={deportista}
        seguimientos={seguimientos}
        periodos={periodos}
        eventos={eventos}
        disciplinas={disciplinas}
        categorias={categorias}
        triage={triage}
        seguimientosTotal={seguimientosTotal}
      />
    </div>
  );
}
