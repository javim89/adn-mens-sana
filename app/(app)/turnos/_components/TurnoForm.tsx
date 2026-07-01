'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { createTurno, updateTurno } from '@/lib/actions/turnos';
import type { TurnoListItem, TurnoFormData, Profesional } from '@/lib/types/turnos';
import DeportistaMultiSelect from './DeportistaMultiSelect';
import ProfesionalCombobox from './ProfesionalCombobox';

interface DeportistaOption {
  id: string;
  nombre: string;
  apellido: string;
}

interface Props {
  mode: 'create' | 'edit';
  isAdmin: boolean;
  profesionales: Profesional[];
  initialData?: TurnoListItem;
}

function buildSchema(isAdmin: boolean) {
  return z
    .object({
      profesionalId: z.string().optional(),
      titulo: z.string().min(1, 'El título es requerido'),
      fecha: z.string().min(1, 'La fecha es requerida'),
      hora: z.string().min(1, 'La hora es requerida'),
      lugar: z.string().min(1, 'El lugar es requerido'),
      descripcion: z.string().optional(),
      deportistaIds: z.array(z.string()),
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
  profesionalId?: string;
  titulo: string;
  fecha: string;
  hora: string;
  lugar: string;
  descripcion?: string;
  deportistaIds: string[];
};

export default function TurnoForm({ mode, isAdmin, profesionales, initialData }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  // DeportistaMultiSelect needs full objects for display; keep them in local state
  const [deportistas, setDeportistas] = useState<DeportistaOption[]>(
    initialData?.deportistas ?? [],
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
      profesionalId: initialData?.profesionalId ?? '',
      titulo: initialData?.titulo ?? '',
      fecha: initialData?.fecha ?? '',
      hora: initialData?.hora ?? '',
      lugar: initialData?.lugar ?? '',
      descripcion: initialData?.descripcion ?? '',
      deportistaIds: initialData?.deportistas.map((d) => d.id) ?? [],
    },
  });

  function onSubmit(values: FormValues) {
    setServerError(null);

    const data: TurnoFormData = {
      titulo: values.titulo,
      fecha: values.fecha,
      hora: values.hora,
      lugar: values.lugar,
      descripcion: values.descripcion || undefined,
      profesionalId: values.profesionalId ?? '',
      deportistaIds: values.deportistaIds,
    };

    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createTurno(data)
          : await updateTurno(initialData!.id, data);

      if (!result.success) {
        setServerError(result.error);
        return;
      }
      router.push('/turnos');
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
                profesionales={profesionales}
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
          Título <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          {...register('titulo')}
          placeholder="Ej: Revisión médica pretemporada"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30 aria-[invalid=true]:border-red-400"
          aria-invalid={errors.titulo ? 'true' : 'false'}
        />
        {errors.titulo && (
          <p className="mt-1 text-xs text-red-600">{errors.titulo.message}</p>
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
            Hora <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            {...register('hora')}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30 aria-[invalid=true]:border-red-400"
            aria-invalid={errors.hora ? 'true' : 'false'}
          />
          {errors.hora && (
            <p className="mt-1 text-xs text-red-600">{errors.hora.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
          Lugar <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          {...register('lugar')}
          placeholder="Ej: Consultorio 3 — Sector Médico"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30 aria-[invalid=true]:border-red-400"
          aria-invalid={errors.lugar ? 'true' : 'false'}
        />
        {errors.lugar && (
          <p className="mt-1 text-xs text-red-600">{errors.lugar.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">Descripción</label>
        <textarea
          {...register('descripcion')}
          rows={3}
          placeholder="Detalles adicionales del turno..."
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">Deportista/s</label>
        <Controller
          name="deportistaIds"
          control={control}
          render={({ field }) => (
            <DeportistaMultiSelect
              value={deportistas}
              onChange={(selected) => {
                setDeportistas(selected);
                field.onChange(selected.map((d) => d.id));
              }}
            />
          )}
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push('/turnos')}
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
            'Guardar turno'
          ) : (
            'Actualizar turno'
          )}
        </button>
      </div>
    </form>
  );
}
