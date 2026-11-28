import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Calculator, CalendarDays } from 'lucide-react';
import { requireContexto } from '@/lib/tenant/contexto';
import { getNombresDeUsuarios } from '@/lib/tenant/miembros';
import { getSeguimientoById } from '@/lib/queries/seguimientos';
import { Avatar } from '@/app/components/ui/avatar';
import { EncabezadoPagina } from '@/app/components/ui/encabezado-pagina';
import { ROTULO_CLASES } from '@/app/components/ui/panel';
import {
  getTipoSeguimientoMeta,
  PRIORIDAD_LABELS,
  PRIORIDAD_STYLES,
} from '@/lib/utils/seguimiento-tipo';
import DeleteSeguimientoModal from '../_components/DeleteSeguimientoModal';
import { inicialesDe } from '../_lib/formato';

interface Props {
  params: Promise<{ id: string }>;
}

function formatDatetime(isoStr: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoStr));
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr + 'T00:00:00'));
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
      <h2 className={`${ROTULO_CLASES} mb-2`}>{title}</h2>
      {children}
    </div>
  );
}

function FieldGrid({ items }: { items: { label: string; value: string | null | undefined }[] }) {
  const visible = items.filter((i) => i.value);
  if (visible.length === 0) return null;
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
      {visible.map(({ label, value }) => (
        <div key={label}>
          <dt className="text-xs text-muted-foreground font-medium mb-0.5">{label}</dt>
          <dd className="text-sm text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function SumatoriaReadout({ label, value, suffix }: { label: string; value: number | null | undefined; suffix?: string }) {
  const hasValue = value !== null && value !== undefined;
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-xs font-medium text-secundario mb-0.5">
        <Calculator size={13} aria-hidden />
        {label}
      </dt>
      <dd className="font-mono text-xl font-semibold leading-tight tabular-nums text-primario">
        {hasValue ? value : <span className="text-muted-foreground">—</span>}
        {hasValue && suffix ? <span className="ml-1 text-sm font-normal text-muted-foreground">{suffix}</span> : null}
      </dd>
    </div>
  );
}

function NumericField({ label, value, suffix }: { label: string; value: number | null | undefined; suffix: string }) {
  if (value === null || value === undefined) return null;
  return (
    <div>
      <dt className="text-xs text-muted-foreground font-medium mb-0.5">{label}</dt>
      <dd className="text-sm text-foreground">
        {value}
        <span className="text-xs text-muted-foreground ml-0.5">{suffix}</span>
      </dd>
    </div>
  );
}

export default async function SeguimientoDetallePage({ params }: Props) {
  const { id } = await params;
  const { userId, rol } = await requireContexto();
  const seguimiento = await getSeguimientoById(id);
  if (!seguimiento) notFound();

  const isAdmin = rol === 'admin';
  const isOwner = seguimiento.profesionalId === userId;
  const canModify = isAdmin || isOwner;

  const profesionalNombre =
    (await getNombresDeUsuarios([seguimiento.profesionalId]))[seguimiento.profesionalId] ??
    seguimiento.profesionalId;

  const prioridad = seguimiento.prioridad;
  const tipo = seguimiento.tipoSeguimiento ?? 'GENERICO';
  const tipoMeta = getTipoSeguimientoMeta(tipo);
  const fechaStr = seguimiento.fecha.toISOString().split('T')[0];


  const t = seguimiento.traumatologia;
  const hc = seguimiento.historiaClinica;
  const ps = seguimiento.evaluacionPsicologica;
  const ca = seguimiento.evaluacionCardiologica;
  const an = seguimiento.antropometria;

  return (
    <div className="p-4 md:p-8">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link
          href="/seguimientos"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Seguimientos
        </Link>
      </div>

      <EncabezadoPagina
        className="mb-6"
        titulo={seguimiento.titulo}
        subtitulo={`${formatDate(fechaStr)} · Profesional: ${profesionalNombre}`}
        accion={
          canModify && (
            <>
              <Link
                href={`/seguimientos/${id}/editar`}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Editar
              </Link>
              <DeleteSeguimientoModal
                seguimientoId={id}
                seguimientoTitulo={seguimiento.titulo}
                redirectAfterDelete="/seguimientos"
              />
            </>
          )
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORIDAD_STYLES[prioridad] ?? 'bg-gray-100 text-gray-600'}`}
          >
            Prioridad {(PRIORIDAD_LABELS[prioridad] ?? prioridad).toLowerCase()}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${tipoMeta.badge}`}
          >
            <span className={`size-1.5 rounded-full ${tipoMeta.dot}`} aria-hidden />
            {tipoMeta.label}
          </span>
        </div>
        {seguimiento.deportistas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin deportistas</p>
        ) : (
          <ul className="flex flex-wrap gap-2" aria-label="Deportistas">
            {seguimiento.deportistas.map(({ deportista: d }) => (
              <li key={d.id}>
                <Link
                  href={`/deportistas/${d.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background py-1 pl-1 pr-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <Avatar
                    alt={`${d.apellido}, ${d.nombre}`}
                    iniciales={inicialesDe(d)}
                    className="size-7 text-[11px]"
                  />
                  {d.apellido}, {d.nombre}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </EncabezadoPagina>

      {/* Content cards */}
      <div className="space-y-4">
        {/* Generic fields */}
        {seguimiento.descripcion && (
          <DetailCard title="Descripción / Observaciones">
            <p className="text-sm text-foreground whitespace-pre-wrap">{seguimiento.descripcion}</p>
          </DetailCard>
        )}

        {seguimiento.recomendaciones && (
          <DetailCard title="Recomendaciones">
            <p className="text-sm text-foreground whitespace-pre-wrap">{seguimiento.recomendaciones}</p>
          </DetailCard>
        )}

        {seguimiento.resultadosEvaluacion && (
          <DetailCard title="Resultados de evaluación">
            <p className="text-sm text-foreground whitespace-pre-wrap">{seguimiento.resultadosEvaluacion}</p>
          </DetailCard>
        )}

        {seguimiento.alertaSeguimiento && (
          <DetailCard title="Alerta de seguimiento">
            <p className="text-sm text-foreground whitespace-pre-wrap">{seguimiento.alertaSeguimiento}</p>
          </DetailCard>
        )}

        {seguimiento.proximaCita && (
          <DetailCard title="Próxima cita">
            <p className="text-sm text-foreground flex items-center gap-2">
              <CalendarDays size={14} className="text-muted-foreground shrink-0" />
              {formatDatetime(seguimiento.proximaCita.toISOString())}
            </p>
          </DetailCard>
        )}

        {/* Traumatología */}
        {tipo === 'TRAUMATOLOGIA' && t && (
          <>
            <DetailCard title="Estabilidad">
              <FieldGrid
                items={[
                  { label: 'Hombro', value: t.estabilidadHombro },
                  { label: 'Rodilla', value: t.estabilidadRodilla },
                  { label: 'Tobillo', value: t.estabilidadTobillo },
                ]}
              />
            </DetailCard>
            <DetailCard title="Movilidad">
              <FieldGrid
                items={[
                  { label: 'Hombro', value: t.movilidadHombro },
                  { label: 'Cadera', value: t.movilidadCadera },
                  { label: 'Rodilla', value: t.movilidadRodilla },
                  { label: 'Tobillo', value: t.movilidadTobillo },
                ]}
              />
            </DetailCard>
            <DetailCard title="Otros">
              <FieldGrid
                items={[
                  { label: 'Discrepancia / Asimetría', value: t.discrepanciaAsimetria },
                  { label: 'Postura', value: t.postura },
                  { label: 'Laxitud', value: t.laxitud },
                  { label: 'Podoscopia', value: t.podoscopia },
                ]}
              />
            </DetailCard>
            {t.observaciones && (
              <DetailCard title="Observaciones (Traumatología)">
                <p className="text-sm text-foreground whitespace-pre-wrap">{t.observaciones}</p>
              </DetailCard>
            )}
          </>
        )}

        {/* Historia Clínica */}
        {tipo === 'HISTORIA_CLINICA' && hc && (
          <DetailCard title="Historia Clínica">
            <FieldGrid
              items={[
                { label: 'Tensión arterial', value: hc.tensionArterial },
                { label: 'Auscultación pulmonar', value: hc.auscultacionPulmonar },
                { label: 'AV Ojo Derecho', value: hc.avOjoDerecho },
                { label: 'AV Ojo Izquierdo', value: hc.avOjoIzquierdo },
                { label: 'Diagnóstico', value: hc.diagnostico },
              ]}
            />
          </DetailCard>
        )}

        {/* Evaluación Psicológica */}
        {tipo === 'EVALUACION_PSICOLOGICA' && ps && (
          <>
            <DetailCard title="CPRD – Características Psicológicas">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                <NumericField label="Control de Estrés" value={ps.cprdControlEstres} suffix="/36" />
                <NumericField label="Influencia de evaluación en rendimiento" value={ps.cprdInfluenciaEvaluacion} suffix="/36" />
                <NumericField label="Motivación" value={ps.cprdMotivacion} suffix="/36" />
                <NumericField label="Habilidad Mental" value={ps.cprdHabilidadMental} suffix="/36" />
                <NumericField label="Cohesión de equipo" value={ps.cprdCohesionEquipo} suffix="/36" />
              </dl>
            </DetailCard>
            {ps.sociograma && (
              <DetailCard title="Sociograma">
                <p className="text-sm text-foreground whitespace-pre-wrap">{ps.sociograma}</p>
              </DetailCard>
            )}
            {ps.poms && (
              <DetailCard title="POMS">
                <p className="text-sm text-foreground whitespace-pre-wrap">{ps.poms}</p>
              </DetailCard>
            )}
            <DetailCard title="STAI – Ansiedad Estado-Rasgo">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                <NumericField label="STAI-AR Rasgo" value={ps.staiRasgo} suffix="/80" />
                <NumericField label="STAI-AE Estado" value={ps.staiEstado} suffix="/80" />
              </dl>
            </DetailCard>
            {ps.observaciones && (
              <DetailCard title="Observaciones (Psicología)">
                <p className="text-sm text-foreground whitespace-pre-wrap">{ps.observaciones}</p>
              </DetailCard>
            )}
          </>
        )}

        {/* Evaluación Cardiológica */}
        {tipo === 'EVALUACION_CARDIOLOGICA' && ca && (
          <DetailCard title="Evaluación Cardiológica">
            <div className="space-y-3">
              {ca.ecg && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-0.5">ECG</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{ca.ecg}</p>
                </div>
              )}
              {ca.examenFisico && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-0.5">Examen físico</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{ca.examenFisico}</p>
                </div>
              )}
              {ca.sintomas && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-0.5">Síntomas</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{ca.sintomas}</p>
                </div>
              )}
              {ca.estudiosAnteriores && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-0.5">Estudios anteriores</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{ca.estudiosAnteriores}</p>
                </div>
              )}
              {ca.diagnostico && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-0.5">Diagnóstico</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{ca.diagnostico}</p>
                </div>
              )}
              {ca.observaciones && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-0.5">Observaciones</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{ca.observaciones}</p>
                </div>
              )}
            </div>
          </DetailCard>
        )}

        {/* Antropometría */}
        {tipo === 'ANTROPOMETRIA' && an && (
          <>
            <dl className="grid grid-cols-2 gap-3 rounded-xl bg-primario-suave p-4">
              <SumatoriaReadout label="IMC" value={an.imc} />
              <SumatoriaReadout label="Suma de pliegues" value={an.sumatoriaPliegues} suffix="mm" />
            </dl>

            <DetailCard title="Básicos">
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
                <NumericField label="Peso" value={an.peso} suffix="kg" />
                <NumericField label="Talla" value={an.talla} suffix="cm" />
                <NumericField label="Tsen" value={an.tsen} suffix="cm" />
              </dl>
            </DetailCard>

            <DetailCard title="Perímetros">
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
                <NumericField label="Brazo" value={an.perimetroBrazo} suffix="cm" />
                <NumericField label="Muslo Medio" value={an.perimetroMusloMedio} suffix="cm" />
                <NumericField label="Pantorrilla" value={an.perimetroPantorrilla} suffix="cm" />
                <NumericField label="Cintura Mínima" value={an.cinturaMinima} suffix="cm" />
                <NumericField label="Cadera Máxima" value={an.caderaMaxima} suffix="cm" />
              </dl>
            </DetailCard>

            <DetailCard title="Pliegues">
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
                <NumericField label="Tríceps" value={an.pliegueTriceps} suffix="mm" />
                <NumericField label="Subescapular" value={an.pliegueSubescapular} suffix="mm" />
                <NumericField label="Supraespinal" value={an.pliegueSupraespinal} suffix="mm" />
                <NumericField label="Abdominal" value={an.pliegueAbdominal} suffix="mm" />
                <NumericField label="Muslo" value={an.pliegueMuslo} suffix="mm" />
                <NumericField label="Pantorrilla" value={an.plieguePantorrilla} suffix="mm" />
              </dl>
            </DetailCard>
          </>
        )}

        {!seguimiento.descripcion &&
          !seguimiento.recomendaciones &&
          !seguimiento.resultadosEvaluacion &&
          !seguimiento.alertaSeguimiento &&
          !seguimiento.proximaCita &&
          !t &&
          !hc &&
          !ps &&
          !ca &&
          !an && (
            <p className="text-sm text-muted-foreground italic">
              No hay información adicional registrada para este seguimiento.
            </p>
          )}
      </div>
    </div>
  );
}
