import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { getSeguimientoById } from '@/lib/queries/seguimientos';
import { getProfesionalesSeguimientos } from '@/lib/actions/seguimientos';
import SeguimientoForm from '../../_components/SeguimientoForm';
import type { SeguimientoListItem, SeguimientoDetalle } from '@/lib/types/seguimientos';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarSeguimientoPage({ params }: Props) {
  const { id } = await params;
  const seguimiento = await getSeguimientoById(id);
  if (!seguimiento) notFound();

  const user = await currentUser();
  const role = String(user?.publicMetadata?.role ?? '');
  const isAdmin = role === 'admin';

  const profesionales = isAdmin ? await getProfesionalesSeguimientos() : [];

  const initialData: SeguimientoListItem & { datosEspecificos?: SeguimientoDetalle } = {
    id: seguimiento.id,
    fecha: seguimiento.fecha.toISOString().split('T')[0],
    titulo: seguimiento.titulo,
    descripcion: seguimiento.descripcion,
    recomendaciones: seguimiento.recomendaciones,
    resultadosEvaluacion: seguimiento.resultadosEvaluacion,
    prioridad: seguimiento.prioridad,
    proximaCita: seguimiento.proximaCita?.toISOString() ?? null,
    alertaSeguimiento: seguimiento.alertaSeguimiento,
    tipoSeguimiento: seguimiento.tipoSeguimiento ?? null,
    profesionalId: seguimiento.profesionalId,
    profesionalNombre: seguimiento.profesionalId,
    deportistaId: seguimiento.deportista.id,
    deportistaNombre: `${seguimiento.deportista.apellido}, ${seguimiento.deportista.nombre}`,
    datosEspecificos: {
      id: seguimiento.id,
      fecha: seguimiento.fecha.toISOString().split('T')[0],
      titulo: seguimiento.titulo,
      descripcion: seguimiento.descripcion,
      recomendaciones: seguimiento.recomendaciones,
      resultadosEvaluacion: seguimiento.resultadosEvaluacion,
      prioridad: seguimiento.prioridad,
      proximaCita: seguimiento.proximaCita?.toISOString() ?? null,
      alertaSeguimiento: seguimiento.alertaSeguimiento,
      tipoSeguimiento: seguimiento.tipoSeguimiento ?? null,
      profesionalId: seguimiento.profesionalId,
      profesionalNombre: seguimiento.profesionalId,
      deportistaId: seguimiento.deportista.id,
      deportistaNombre: `${seguimiento.deportista.apellido}, ${seguimiento.deportista.nombre}`,
      traumatologia: seguimiento.traumatologia
        ? {
            estabilidadHombro: seguimiento.traumatologia.estabilidadHombro ?? undefined,
            estabilidadRodilla: seguimiento.traumatologia.estabilidadRodilla ?? undefined,
            estabilidadTobillo: seguimiento.traumatologia.estabilidadTobillo ?? undefined,
            movilidadHombro: seguimiento.traumatologia.movilidadHombro ?? undefined,
            movilidadCadera: seguimiento.traumatologia.movilidadCadera ?? undefined,
            movilidadRodilla: seguimiento.traumatologia.movilidadRodilla ?? undefined,
            movilidadTobillo: seguimiento.traumatologia.movilidadTobillo ?? undefined,
            discrepanciaAsimetria: seguimiento.traumatologia.discrepanciaAsimetria ?? undefined,
            postura: seguimiento.traumatologia.postura ?? undefined,
            laxitud: seguimiento.traumatologia.laxitud ?? undefined,
            podoscopia: seguimiento.traumatologia.podoscopia ?? undefined,
            observaciones: seguimiento.traumatologia.observaciones ?? undefined,
          }
        : null,
      historiaClinica: seguimiento.historiaClinica
        ? {
            tensionArterial: seguimiento.historiaClinica.tensionArterial ?? undefined,
            auscultacionPulmonar: seguimiento.historiaClinica.auscultacionPulmonar ?? undefined,
            avOjoDerecho: seguimiento.historiaClinica.avOjoDerecho ?? undefined,
            avOjoIzquierdo: seguimiento.historiaClinica.avOjoIzquierdo ?? undefined,
            diagnostico: seguimiento.historiaClinica.diagnostico ?? undefined,
          }
        : null,
      evaluacionPsicologica: seguimiento.evaluacionPsicologica
        ? {
            cprdControlEstres: seguimiento.evaluacionPsicologica.cprdControlEstres ?? undefined,
            cprdInfluenciaEvaluacion: seguimiento.evaluacionPsicologica.cprdInfluenciaEvaluacion ?? undefined,
            cprdMotivacion: seguimiento.evaluacionPsicologica.cprdMotivacion ?? undefined,
            cprdHabilidadMental: seguimiento.evaluacionPsicologica.cprdHabilidadMental ?? undefined,
            cprdCohesionEquipo: seguimiento.evaluacionPsicologica.cprdCohesionEquipo ?? undefined,
            sociograma: seguimiento.evaluacionPsicologica.sociograma ?? undefined,
            poms: seguimiento.evaluacionPsicologica.poms ?? undefined,
            staiRasgo: seguimiento.evaluacionPsicologica.staiRasgo ?? undefined,
            staiEstado: seguimiento.evaluacionPsicologica.staiEstado ?? undefined,
            observaciones: seguimiento.evaluacionPsicologica.observaciones ?? undefined,
          }
        : null,
      evaluacionCardiologica: seguimiento.evaluacionCardiologica
        ? {
            ecg: seguimiento.evaluacionCardiologica.ecg ?? undefined,
            examenFisico: seguimiento.evaluacionCardiologica.examenFisico ?? undefined,
            sintomas: seguimiento.evaluacionCardiologica.sintomas ?? undefined,
            estudiosAnteriores: seguimiento.evaluacionCardiologica.estudiosAnteriores ?? undefined,
            diagnostico: seguimiento.evaluacionCardiologica.diagnostico ?? undefined,
            observaciones: seguimiento.evaluacionCardiologica.observaciones ?? undefined,
          }
        : null,
      antropometria: seguimiento.antropometria
        ? {
            peso: seguimiento.antropometria.peso ?? undefined,
            talla: seguimiento.antropometria.talla ?? undefined,
            tsen: seguimiento.antropometria.tsen ?? undefined,
            perimetroBrazo: seguimiento.antropometria.perimetroBrazo ?? undefined,
            perimetroMusloMedio: seguimiento.antropometria.perimetroMusloMedio ?? undefined,
            perimetroPantorrilla: seguimiento.antropometria.perimetroPantorrilla ?? undefined,
            cinturaMinima: seguimiento.antropometria.cinturaMinima ?? undefined,
            caderaMaxima: seguimiento.antropometria.caderaMaxima ?? undefined,
            pliegueTriceps: seguimiento.antropometria.pliegueTriceps ?? undefined,
            pliegueSubescapular: seguimiento.antropometria.pliegueSubescapular ?? undefined,
            pliegueSupraespinal: seguimiento.antropometria.pliegueSupraespinal ?? undefined,
            pliegueAbdominal: seguimiento.antropometria.pliegueAbdominal ?? undefined,
            pliegueMuslo: seguimiento.antropometria.pliegueMuslo ?? undefined,
            plieguePantorrilla: seguimiento.antropometria.plieguePantorrilla ?? undefined,
            imc: seguimiento.antropometria.imc ?? undefined,
            sumatoriaPliegues: seguimiento.antropometria.sumatoriaPliegues ?? undefined,
          }
        : null,
    },
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-2">
        <Link
          href={`/seguimientos/${id}`}
          className="text-sm text-[#6B7280] hover:text-[#1C1C1C] transition-colors"
        >
          ← Volver al seguimiento
        </Link>
      </div>
      <h1
        className="text-3xl font-bold text-[#121A61] mb-6"
        style={{ fontFamily: 'Oswald, sans-serif' }}
      >
        Editar seguimiento
      </h1>
      <SeguimientoForm
        mode="edit"
        isAdmin={isAdmin}
        role={role}
        profesionales={profesionales}
        initialData={initialData}
      />
    </div>
  );
}
