'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { createSeguimiento, updateSeguimiento } from '@/lib/actions/seguimientos';
import type {
  SeguimientoListItem,
  SeguimientoFormData,
  Profesional,
  TipoSeguimiento,
  SeguimientoDetalle,
} from '@/lib/types/seguimientos';
import DeportistaSelect from './DeportistaSelect';
import ProfesionalCombobox from '@/app/(app)/turnos/_components/ProfesionalCombobox';
import { CustomSelect } from '@/app/components/ui/custom-select';
import type { Profesional as TurnoProfesional } from '@/lib/types/turnos';
import { TraumatologiaSection } from './sections/TraumatologiaSection';
import { HistoriaClinicaSection } from './sections/HistoriaClinicaSection';
import { EvaluacionPsicologicaSection } from './sections/EvaluacionPsicologicaSection';
import { EvaluacionCardiologicaSection } from './sections/EvaluacionCardiologicaSection';
import { AntropometriaSection } from './sections/AntropometriaSection';

interface DeportistaOption {
  id: string;
  nombre: string;
  apellido: string;
}

export interface Props {
  mode: 'create' | 'edit';
  isAdmin: boolean;
  role: string;
  profesionales: Profesional[];
  initialData?: SeguimientoListItem & { datosEspecificos?: SeguimientoDetalle };
}

const PRIORIDAD_OPTIONS = [
  { value: 'BAJA', label: 'Baja' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'URGENTE', label: 'Urgente' },
];

const TIPO_OPTIONS_ALL = [
  { value: 'GENERICO', label: 'Genérico' },
  { value: 'TRAUMATOLOGIA', label: 'Traumatología' },
  { value: 'HISTORIA_CLINICA', label: 'Historia Clínica' },
  { value: 'EVALUACION_PSICOLOGICA', label: 'Evaluación Psicológica' },
  { value: 'EVALUACION_CARDIOLOGICA', label: 'Evaluación Cardiológica' },
  { value: 'ANTROPOMETRIA', label: 'Antropometría' },
];

const TIPOS_POR_ROL: Record<string, TipoSeguimiento[]> = {
  medico: ['GENERICO', 'TRAUMATOLOGIA', 'HISTORIA_CLINICA'],
  psicologo: ['GENERICO', 'EVALUACION_PSICOLOGICA'],
  cardiologo: ['GENERICO', 'EVALUACION_CARDIOLOGICA'],
  nutricionista: ['GENERICO', 'ANTROPOMETRIA'],
  admin: ['GENERICO', 'TRAUMATOLOGIA', 'HISTORIA_CLINICA', 'EVALUACION_PSICOLOGICA', 'EVALUACION_CARDIOLOGICA', 'ANTROPOMETRIA'],
};

function getTiposDisponibles(role: string) {
  const tipos = TIPOS_POR_ROL[role] ?? ['GENERICO'];
  return TIPO_OPTIONS_ALL.filter((opt) => tipos.includes(opt.value as TipoSeguimiento));
}

const cprdField = z.number().int().min(0, 'Mínimo 0').max(36, 'Máximo 36').optional().or(z.nan().transform(() => undefined));
const staiField = z.number().int().min(0, 'Mínimo 0').max(80, 'Máximo 80').optional().or(z.nan().transform(() => undefined));
const antropometriaField = z.number().min(0, 'Mínimo 0').optional().or(z.nan().transform(() => undefined));

function buildSchema(isAdmin: boolean) {
  return z
    .object({
      deportistaId: z.string().min(1, 'El deportista es requerido'),
      profesionalId: z.string().optional(),
      fecha: z.string().min(1, 'La fecha es requerida'),
      titulo: z.string().min(1, 'El título es requerido'),
      prioridad: z.enum(['BAJA', 'MEDIA', 'ALTA', 'URGENTE']),
      tipoSeguimiento: z.string().optional(),
      descripcion: z.string().optional(),
      recomendaciones: z.string().optional(),
      resultadosEvaluacion: z.string().optional(),
      proximaCita: z.string().optional(),
      alertaSeguimiento: z.string().optional(),
      // Traumatología fields
      traumatologia_estabilidadHombro: z.string().optional(),
      traumatologia_estabilidadRodilla: z.string().optional(),
      traumatologia_estabilidadTobillo: z.string().optional(),
      traumatologia_movilidadHombro: z.string().optional(),
      traumatologia_movilidadCadera: z.string().optional(),
      traumatologia_movilidadRodilla: z.string().optional(),
      traumatologia_movilidadTobillo: z.string().optional(),
      traumatologia_discrepanciaAsimetria: z.string().optional(),
      traumatologia_postura: z.string().optional(),
      traumatologia_laxitud: z.string().optional(),
      traumatologia_podoscopia: z.string().optional(),
      traumatologia_observaciones: z.string().optional(),
      // Historia Clínica fields
      historiaClinica_tensionArterial: z.string().optional(),
      historiaClinica_auscultacionPulmonar: z.string().optional(),
      historiaClinica_avOjoDerecho: z.string().optional(),
      historiaClinica_avOjoIzquierdo: z.string().optional(),
      historiaClinica_diagnostico: z.string().optional(),
      // Evaluación Psicológica fields
      psicologica_cprdControlEstres: cprdField,
      psicologica_cprdInfluenciaEvaluacion: cprdField,
      psicologica_cprdMotivacion: cprdField,
      psicologica_cprdHabilidadMental: cprdField,
      psicologica_cprdCohesionEquipo: cprdField,
      psicologica_sociograma: z.string().optional(),
      psicologica_poms: z.string().optional(),
      psicologica_staiRasgo: staiField,
      psicologica_staiEstado: staiField,
      psicologica_observaciones: z.string().optional(),
      // Evaluación Cardiológica fields
      cardiologica_ecg: z.string().optional(),
      cardiologica_examenFisico: z.string().optional(),
      cardiologica_sintomas: z.string().optional(),
      cardiologica_estudiosAnteriores: z.string().optional(),
      cardiologica_diagnostico: z.string().optional(),
      cardiologica_observaciones: z.string().optional(),
      // Antropometría fields
      antropometria_peso: antropometriaField,
      antropometria_talla: antropometriaField,
      antropometria_tsen: antropometriaField,
      antropometria_perimetroBrazo: antropometriaField,
      antropometria_perimetroMusloMedio: antropometriaField,
      antropometria_perimetroPantorrilla: antropometriaField,
      antropometria_cinturaMinima: antropometriaField,
      antropometria_caderaMaxima: antropometriaField,
      antropometria_pliegueTriceps: antropometriaField,
      antropometria_pliegueSubescapular: antropometriaField,
      antropometria_pliegueSupraespinal: antropometriaField,
      antropometria_pliegueAbdominal: antropometriaField,
      antropometria_pliegueMuslo: antropometriaField,
      antropometria_plieguePantorrilla: antropometriaField,
    })
    .superRefine((data, ctx) => {
      if (isAdmin && !data.profesionalId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El área responsable es requerida',
          path: ['profesionalId'],
        });
      }
    });
}

export type SeguimientoExtendedFormValues = z.infer<ReturnType<typeof buildSchema>>;

function toDatetimeLocal(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SeguimientoForm({ mode, isAdmin, role, profesionales, initialData }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const [deportistaOption, setDeportistaOption] = useState<DeportistaOption | null>(
    initialData
      ? {
          id: initialData.deportistaId,
          nombre: initialData.deportistaNombre.split(', ')[1] ?? '',
          apellido: initialData.deportistaNombre.split(', ')[0] ?? '',
        }
      : null,
  );

  const tiposDisponibles = useMemo(() => getTiposDisponibles(role), [role]);
  const schema = useMemo(() => buildSchema(isAdmin), [isAdmin]);

  const initialTipo = initialData?.tipoSeguimiento ?? 'GENERICO';

  // Build default values from initialData including satellite data
  const d = initialData?.datosEspecificos;
  const traumatologia = d?.traumatologia ?? null;
  const historiaClinica = d?.historiaClinica ?? null;
  const evaluacionPsicologica = d?.evaluacionPsicologica ?? null;
  const evaluacionCardiologica = d?.evaluacionCardiologica ?? null;
  const antropometria = d?.antropometria ?? null;

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SeguimientoExtendedFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      deportistaId: initialData?.deportistaId ?? '',
      profesionalId: initialData?.profesionalId ?? '',
      fecha: initialData?.fecha ?? '',
      titulo: initialData?.titulo ?? '',
      prioridad: (initialData?.prioridad as SeguimientoExtendedFormValues['prioridad']) ?? 'MEDIA',
      tipoSeguimiento: initialTipo,
      descripcion: initialData?.descripcion ?? '',
      recomendaciones: initialData?.recomendaciones ?? '',
      resultadosEvaluacion: initialData?.resultadosEvaluacion ?? '',
      proximaCita: toDatetimeLocal(initialData?.proximaCita),
      alertaSeguimiento: initialData?.alertaSeguimiento ?? '',
      // Traumatología
      traumatologia_estabilidadHombro: traumatologia?.estabilidadHombro ?? '',
      traumatologia_estabilidadRodilla: traumatologia?.estabilidadRodilla ?? '',
      traumatologia_estabilidadTobillo: traumatologia?.estabilidadTobillo ?? '',
      traumatologia_movilidadHombro: traumatologia?.movilidadHombro ?? '',
      traumatologia_movilidadCadera: traumatologia?.movilidadCadera ?? '',
      traumatologia_movilidadRodilla: traumatologia?.movilidadRodilla ?? '',
      traumatologia_movilidadTobillo: traumatologia?.movilidadTobillo ?? '',
      traumatologia_discrepanciaAsimetria: traumatologia?.discrepanciaAsimetria ?? '',
      traumatologia_postura: traumatologia?.postura ?? '',
      traumatologia_laxitud: traumatologia?.laxitud ?? '',
      traumatologia_podoscopia: traumatologia?.podoscopia ?? '',
      traumatologia_observaciones: traumatologia?.observaciones ?? '',
      // Historia Clínica
      historiaClinica_tensionArterial: historiaClinica?.tensionArterial ?? '',
      historiaClinica_auscultacionPulmonar: historiaClinica?.auscultacionPulmonar ?? '',
      historiaClinica_avOjoDerecho: historiaClinica?.avOjoDerecho ?? '',
      historiaClinica_avOjoIzquierdo: historiaClinica?.avOjoIzquierdo ?? '',
      historiaClinica_diagnostico: historiaClinica?.diagnostico ?? '',
      // Psicología
      psicologica_cprdControlEstres: evaluacionPsicologica?.cprdControlEstres ?? undefined,
      psicologica_cprdInfluenciaEvaluacion: evaluacionPsicologica?.cprdInfluenciaEvaluacion ?? undefined,
      psicologica_cprdMotivacion: evaluacionPsicologica?.cprdMotivacion ?? undefined,
      psicologica_cprdHabilidadMental: evaluacionPsicologica?.cprdHabilidadMental ?? undefined,
      psicologica_cprdCohesionEquipo: evaluacionPsicologica?.cprdCohesionEquipo ?? undefined,
      psicologica_sociograma: evaluacionPsicologica?.sociograma ?? '',
      psicologica_poms: evaluacionPsicologica?.poms ?? '',
      psicologica_staiRasgo: evaluacionPsicologica?.staiRasgo ?? undefined,
      psicologica_staiEstado: evaluacionPsicologica?.staiEstado ?? undefined,
      psicologica_observaciones: evaluacionPsicologica?.observaciones ?? '',
      // Cardiología
      cardiologica_ecg: evaluacionCardiologica?.ecg ?? '',
      cardiologica_examenFisico: evaluacionCardiologica?.examenFisico ?? '',
      cardiologica_sintomas: evaluacionCardiologica?.sintomas ?? '',
      cardiologica_estudiosAnteriores: evaluacionCardiologica?.estudiosAnteriores ?? '',
      cardiologica_diagnostico: evaluacionCardiologica?.diagnostico ?? '',
      cardiologica_observaciones: evaluacionCardiologica?.observaciones ?? '',
      // Antropometría
      antropometria_peso: antropometria?.peso ?? undefined,
      antropometria_talla: antropometria?.talla ?? undefined,
      antropometria_tsen: antropometria?.tsen ?? undefined,
      antropometria_perimetroBrazo: antropometria?.perimetroBrazo ?? undefined,
      antropometria_perimetroMusloMedio: antropometria?.perimetroMusloMedio ?? undefined,
      antropometria_perimetroPantorrilla: antropometria?.perimetroPantorrilla ?? undefined,
      antropometria_cinturaMinima: antropometria?.cinturaMinima ?? undefined,
      antropometria_caderaMaxima: antropometria?.caderaMaxima ?? undefined,
      antropometria_pliegueTriceps: antropometria?.pliegueTriceps ?? undefined,
      antropometria_pliegueSubescapular: antropometria?.pliegueSubescapular ?? undefined,
      antropometria_pliegueSupraespinal: antropometria?.pliegueSupraespinal ?? undefined,
      antropometria_pliegueAbdominal: antropometria?.pliegueAbdominal ?? undefined,
      antropometria_pliegueMuslo: antropometria?.pliegueMuslo ?? undefined,
      antropometria_plieguePantorrilla: antropometria?.plieguePantorrilla ?? undefined,
    },
  });

  const watchedTipo = watch('tipoSeguimiento') ?? 'GENERICO';

  const turnoProfesionales: TurnoProfesional[] = profesionales.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    apellido: p.apellido,
    rol: p.rol,
  }));

  function buildDatosEspecificos(values: SeguimientoExtendedFormValues): SeguimientoFormData['datosEspecificos'] {
    const tipo = (values.tipoSeguimiento ?? 'GENERICO') as TipoSeguimiento;
    switch (tipo) {
      case 'TRAUMATOLOGIA':
        return {
          tipo: 'TRAUMATOLOGIA',
          datos: {
            estabilidadHombro: values.traumatologia_estabilidadHombro || undefined,
            estabilidadRodilla: values.traumatologia_estabilidadRodilla || undefined,
            estabilidadTobillo: values.traumatologia_estabilidadTobillo || undefined,
            movilidadHombro: values.traumatologia_movilidadHombro || undefined,
            movilidadCadera: values.traumatologia_movilidadCadera || undefined,
            movilidadRodilla: values.traumatologia_movilidadRodilla || undefined,
            movilidadTobillo: values.traumatologia_movilidadTobillo || undefined,
            discrepanciaAsimetria: values.traumatologia_discrepanciaAsimetria || undefined,
            postura: values.traumatologia_postura || undefined,
            laxitud: values.traumatologia_laxitud || undefined,
            podoscopia: values.traumatologia_podoscopia || undefined,
            observaciones: values.traumatologia_observaciones || undefined,
          },
        };
      case 'HISTORIA_CLINICA':
        return {
          tipo: 'HISTORIA_CLINICA',
          datos: {
            tensionArterial: values.historiaClinica_tensionArterial || undefined,
            auscultacionPulmonar: values.historiaClinica_auscultacionPulmonar || undefined,
            avOjoDerecho: values.historiaClinica_avOjoDerecho || undefined,
            avOjoIzquierdo: values.historiaClinica_avOjoIzquierdo || undefined,
            diagnostico: values.historiaClinica_diagnostico || undefined,
          },
        };
      case 'EVALUACION_PSICOLOGICA':
        return {
          tipo: 'EVALUACION_PSICOLOGICA',
          datos: {
            cprdControlEstres: typeof values.psicologica_cprdControlEstres === 'number' && !isNaN(values.psicologica_cprdControlEstres) ? values.psicologica_cprdControlEstres : undefined,
            cprdInfluenciaEvaluacion: typeof values.psicologica_cprdInfluenciaEvaluacion === 'number' && !isNaN(values.psicologica_cprdInfluenciaEvaluacion) ? values.psicologica_cprdInfluenciaEvaluacion : undefined,
            cprdMotivacion: typeof values.psicologica_cprdMotivacion === 'number' && !isNaN(values.psicologica_cprdMotivacion) ? values.psicologica_cprdMotivacion : undefined,
            cprdHabilidadMental: typeof values.psicologica_cprdHabilidadMental === 'number' && !isNaN(values.psicologica_cprdHabilidadMental) ? values.psicologica_cprdHabilidadMental : undefined,
            cprdCohesionEquipo: typeof values.psicologica_cprdCohesionEquipo === 'number' && !isNaN(values.psicologica_cprdCohesionEquipo) ? values.psicologica_cprdCohesionEquipo : undefined,
            sociograma: values.psicologica_sociograma || undefined,
            poms: values.psicologica_poms || undefined,
            staiRasgo: typeof values.psicologica_staiRasgo === 'number' && !isNaN(values.psicologica_staiRasgo) ? values.psicologica_staiRasgo : undefined,
            staiEstado: typeof values.psicologica_staiEstado === 'number' && !isNaN(values.psicologica_staiEstado) ? values.psicologica_staiEstado : undefined,
            observaciones: values.psicologica_observaciones || undefined,
          },
        };
      case 'EVALUACION_CARDIOLOGICA':
        return {
          tipo: 'EVALUACION_CARDIOLOGICA',
          datos: {
            ecg: values.cardiologica_ecg || undefined,
            examenFisico: values.cardiologica_examenFisico || undefined,
            sintomas: values.cardiologica_sintomas || undefined,
            estudiosAnteriores: values.cardiologica_estudiosAnteriores || undefined,
            diagnostico: values.cardiologica_diagnostico || undefined,
            observaciones: values.cardiologica_observaciones || undefined,
          },
        };
      case 'ANTROPOMETRIA': {
        const num = (v: number | undefined) =>
          typeof v === 'number' && !isNaN(v) ? v : undefined;
        return {
          tipo: 'ANTROPOMETRIA',
          datos: {
            peso: num(values.antropometria_peso),
            talla: num(values.antropometria_talla),
            tsen: num(values.antropometria_tsen),
            perimetroBrazo: num(values.antropometria_perimetroBrazo),
            perimetroMusloMedio: num(values.antropometria_perimetroMusloMedio),
            perimetroPantorrilla: num(values.antropometria_perimetroPantorrilla),
            cinturaMinima: num(values.antropometria_cinturaMinima),
            caderaMaxima: num(values.antropometria_caderaMaxima),
            pliegueTriceps: num(values.antropometria_pliegueTriceps),
            pliegueSubescapular: num(values.antropometria_pliegueSubescapular),
            pliegueSupraespinal: num(values.antropometria_pliegueSupraespinal),
            pliegueAbdominal: num(values.antropometria_pliegueAbdominal),
            pliegueMuslo: num(values.antropometria_pliegueMuslo),
            plieguePantorrilla: num(values.antropometria_plieguePantorrilla),
          },
        };
      }
      default:
        return { tipo: 'GENERICO', datos: {} };
    }
  }

  function onSubmit(values: SeguimientoExtendedFormValues) {
    setServerError(null);

    const tipo = (values.tipoSeguimiento ?? 'GENERICO') as TipoSeguimiento;

    const data: SeguimientoFormData = {
      deportistaId: values.deportistaId,
      profesionalId: values.profesionalId ?? '',
      fecha: values.fecha,
      titulo: values.titulo,
      prioridad: values.prioridad,
      tipoSeguimiento: tipo,
      descripcion: values.descripcion || undefined,
      recomendaciones: values.recomendaciones || undefined,
      resultadosEvaluacion: values.resultadosEvaluacion || undefined,
      proximaCita: values.proximaCita || undefined,
      alertaSeguimiento: values.alertaSeguimiento || undefined,
      datosEspecificos: buildDatosEspecificos(values),
    };

    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createSeguimiento(data)
          : await updateSeguimiento(initialData!.id, data);

      if (!result.success) {
        setServerError(result.error);
        return;
      }
      router.push('/seguimientos');
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-2xl mx-auto space-y-5">
      {serverError && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {serverError}
        </div>
      )}

      {isAdmin && (
        <div>
          <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
            Área responsable <span className="text-red-500">*</span>
          </label>
          <Controller
            name="profesionalId"
            control={control}
            render={({ field }) => (
              <ProfesionalCombobox
                profesionales={turnoProfesionales}
                value={field.value ?? ''}
                onChange={field.onChange}
              />
            )}
          />
          {errors.profesionalId && (
            <p className="mt-1 text-xs text-red-600">{errors.profesionalId.message}</p>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
          Deportista <span className="text-red-500">*</span>
        </label>
        <Controller
          name="deportistaId"
          control={control}
          render={({ field }) => (
            <DeportistaSelect
              value={deportistaOption}
              onChange={(option) => {
                setDeportistaOption(option);
                field.onChange(option?.id ?? '');
              }}
            />
          )}
        />
        {errors.deportistaId && (
          <p className="mt-1 text-xs text-red-600">{errors.deportistaId.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
            Fecha <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            {...register('fecha')}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30 aria-[invalid=true]:border-red-400"
            aria-invalid={errors.fecha ? 'true' : 'false'}
          />
          {errors.fecha && (
            <p className="mt-1 text-xs text-red-600">{errors.fecha.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
            Próxima cita
          </label>
          <input
            type="datetime-local"
            {...register('proximaCita')}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
          />
        </div>
      </div>

      {tiposDisponibles.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
            Tipo de seguimiento
          </label>
          <Controller
            name="tipoSeguimiento"
            control={control}
            render={({ field }) => (
              <CustomSelect
                value={field.value ?? 'GENERICO'}
                onChange={field.onChange}
                options={tiposDisponibles}
                placeholder="Seleccionar tipo..."
              />
            )}
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
          Título / Motivo <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          {...register('titulo')}
          placeholder="Ej: Evaluación de rodilla post-lesión"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30 aria-[invalid=true]:border-red-400"
          aria-invalid={errors.titulo ? 'true' : 'false'}
        />
        {errors.titulo && (
          <p className="mt-1 text-xs text-red-600">{errors.titulo.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">Prioridad</label>
        <Controller
          name="prioridad"
          control={control}
          render={({ field }) => (
            <CustomSelect
              value={field.value}
              onChange={field.onChange}
              options={PRIORIDAD_OPTIONS}
              placeholder="Seleccionar prioridad..."
            />
          )}
        />
      </div>

      {/* Dynamic specific-type sections */}
      {watchedTipo === 'TRAUMATOLOGIA' && (
        <>
          <hr className="border-gray-100" />
          <div>
            <p className="text-xs font-semibold uppercase text-[#6B7280] mb-3 tracking-wide">
              Datos traumatológicos
            </p>
            <TraumatologiaSection register={register} errors={errors} />
          </div>
        </>
      )}

      {watchedTipo === 'HISTORIA_CLINICA' && (
        <>
          <hr className="border-gray-100" />
          <div>
            <p className="text-xs font-semibold uppercase text-[#6B7280] mb-3 tracking-wide">
              Historia clínica
            </p>
            <HistoriaClinicaSection register={register} errors={errors} />
          </div>
        </>
      )}

      {watchedTipo === 'EVALUACION_PSICOLOGICA' && (
        <>
          <hr className="border-gray-100" />
          <div>
            <p className="text-xs font-semibold uppercase text-[#6B7280] mb-3 tracking-wide">
              Evaluación psicológica
            </p>
            <EvaluacionPsicologicaSection register={register} errors={errors} />
          </div>
        </>
      )}

      {watchedTipo === 'EVALUACION_CARDIOLOGICA' && (
        <>
          <hr className="border-gray-100" />
          <div>
            <p className="text-xs font-semibold uppercase text-[#6B7280] mb-3 tracking-wide">
              Evaluación cardiológica
            </p>
            <EvaluacionCardiologicaSection register={register} errors={errors} />
          </div>
        </>
      )}

      {watchedTipo === 'ANTROPOMETRIA' && (
        <>
          <hr className="border-gray-100" />
          <div>
            <p className="text-xs font-semibold uppercase text-[#6B7280] mb-3 tracking-wide">
              Antropometría
            </p>
            <AntropometriaSection register={register} watch={watch} errors={errors} />
          </div>
        </>
      )}

      <hr className="border-gray-100" />

      <div>
        <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
          Descripción / Observaciones
        </label>
        <textarea
          {...register('descripcion')}
          rows={3}
          placeholder="Detalles del seguimiento, estado actual del deportista..."
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
          Recomendaciones
        </label>
        <textarea
          {...register('recomendaciones')}
          rows={3}
          placeholder="Indicaciones, plan de acción..."
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
          Resultados de evaluación
        </label>
        <textarea
          {...register('resultadosEvaluacion')}
          rows={3}
          placeholder="Mediciones, diagnósticos, resultados de tests..."
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
          Alerta de seguimiento
        </label>
        <textarea
          {...register('alertaSeguimiento')}
          rows={2}
          placeholder="Señales de alerta a monitorear..."
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push('/seguimientos')}
          disabled={isPending}
          className="text-sm text-[#6B7280] hover:text-[#1C1C1C] border border-gray-200 rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 bg-[#121A61] text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-[#1E2A8A] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              {mode === 'create' ? 'Guardando...' : 'Actualizando...'}
            </>
          ) : mode === 'create' ? (
            'Guardar seguimiento'
          ) : (
            'Actualizar seguimiento'
          )}
        </button>
      </div>
    </form>
  );
}
