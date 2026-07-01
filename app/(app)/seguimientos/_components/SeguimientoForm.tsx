'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { createSeguimiento, updateSeguimiento } from '@/lib/actions/seguimientos';
import type { SeguimientoListItem, SeguimientoFormData, Profesional } from '@/lib/types/seguimientos';
import DeportistaSelect from './DeportistaSelect';
import ProfesionalCombobox from '@/app/(app)/turnos/_components/ProfesionalCombobox';
import { CustomSelect } from '@/app/components/ui/custom-select';
import type { Profesional as TurnoProfesional } from '@/lib/types/turnos';

interface DeportistaOption {
  id: string;
  nombre: string;
  apellido: string;
}

interface Props {
  mode: 'create' | 'edit';
  isAdmin: boolean;
  profesionales: Profesional[];
  initialData?: SeguimientoListItem;
}

const PRIORIDAD_OPTIONS = [
  { value: 'BAJA', label: 'Baja' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'URGENTE', label: 'Urgente' },
];

function buildSchema(isAdmin: boolean) {
  return z
    .object({
      deportistaId: z.string().min(1, 'El deportista es requerido'),
      profesionalId: z.string().optional(),
      fecha: z.string().min(1, 'La fecha es requerida'),
      titulo: z.string().min(1, 'El título es requerido'),
      prioridad: z.enum(['BAJA', 'MEDIA', 'ALTA', 'URGENTE']),
      descripcion: z.string().optional(),
      recomendaciones: z.string().optional(),
      resultadosEvaluacion: z.string().optional(),
      proximaCita: z.string().optional(),
      alertaSeguimiento: z.string().optional(),
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

type FormValues = {
  deportistaId: string;
  profesionalId?: string;
  fecha: string;
  titulo: string;
  prioridad: 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  descripcion?: string;
  recomendaciones?: string;
  resultadosEvaluacion?: string;
  proximaCita?: string;
  alertaSeguimiento?: string;
};

function toDatetimeLocal(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SeguimientoForm({ mode, isAdmin, profesionales, initialData }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  // DeportistaSelect needs the full object; we keep it in local state
  const [deportistaOption, setDeportistaOption] = useState<DeportistaOption | null>(
    initialData
      ? {
          id: initialData.deportistaId,
          nombre: initialData.deportistaNombre.split(', ')[1] ?? '',
          apellido: initialData.deportistaNombre.split(', ')[0] ?? '',
        }
      : null,
  );

  const schema = useMemo(() => buildSchema(isAdmin), [isAdmin]);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      deportistaId: initialData?.deportistaId ?? '',
      profesionalId: initialData?.profesionalId ?? '',
      fecha: initialData?.fecha ?? '',
      titulo: initialData?.titulo ?? '',
      prioridad: (initialData?.prioridad as FormValues['prioridad']) ?? 'MEDIA',
      descripcion: initialData?.descripcion ?? '',
      recomendaciones: initialData?.recomendaciones ?? '',
      resultadosEvaluacion: initialData?.resultadosEvaluacion ?? '',
      proximaCita: toDatetimeLocal(initialData?.proximaCita),
      alertaSeguimiento: initialData?.alertaSeguimiento ?? '',
    },
  });

  const turnoProfesionales: TurnoProfesional[] = profesionales.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    apellido: p.apellido,
    rol: p.rol,
  }));

  function onSubmit(values: FormValues) {
    setServerError(null);

    const data: SeguimientoFormData = {
      deportistaId: values.deportistaId,
      profesionalId: values.profesionalId ?? '',
      fecha: values.fecha,
      titulo: values.titulo,
      prioridad: values.prioridad,
      descripcion: values.descripcion || undefined,
      recomendaciones: values.recomendaciones || undefined,
      resultadosEvaluacion: values.resultadosEvaluacion || undefined,
      proximaCita: values.proximaCita || undefined,
      alertaSeguimiento: values.alertaSeguimiento || undefined,
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
