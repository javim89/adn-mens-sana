import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { SeguimientoExtendedFormValues } from '../SeguimientoForm';

interface Props {
  register: UseFormRegister<SeguimientoExtendedFormValues>;
  errors: FieldErrors<SeguimientoExtendedFormValues>;
}

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30';

const labelClass = 'block text-sm font-medium text-[#1C1C1C] mb-1.5';

export function EvaluacionCardiologicaSection({ register, errors }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="cardiologica_ecg" className={labelClass}>ECG</label>
        <textarea
          id="cardiologica_ecg"
          {...register('cardiologica_ecg')}
          rows={2}
          placeholder="Resultados del electrocardiograma..."
          className={`${inputClass} resize-none`}
        />
        {errors.cardiologica_ecg && (
          <p className="mt-1 text-xs text-red-600">{errors.cardiologica_ecg.message}</p>
        )}
      </div>
      <div>
        <label htmlFor="cardiologica_examenFisico" className={labelClass}>Examen físico</label>
        <textarea
          id="cardiologica_examenFisico"
          {...register('cardiologica_examenFisico')}
          rows={2}
          placeholder="Hallazgos del examen físico cardiológico..."
          className={`${inputClass} resize-none`}
        />
        {errors.cardiologica_examenFisico && (
          <p className="mt-1 text-xs text-red-600">{errors.cardiologica_examenFisico.message}</p>
        )}
      </div>
      <div>
        <label htmlFor="cardiologica_sintomas" className={labelClass}>Síntomas</label>
        <textarea
          id="cardiologica_sintomas"
          {...register('cardiologica_sintomas')}
          rows={2}
          placeholder="Síntomas referidos por el deportista..."
          className={`${inputClass} resize-none`}
        />
        {errors.cardiologica_sintomas && (
          <p className="mt-1 text-xs text-red-600">{errors.cardiologica_sintomas.message}</p>
        )}
      </div>
      <div>
        <label htmlFor="cardiologica_estudiosAnteriores" className={labelClass}>Estudios anteriores</label>
        <textarea
          id="cardiologica_estudiosAnteriores"
          {...register('cardiologica_estudiosAnteriores')}
          rows={2}
          placeholder="Estudios cardiológicos previos relevantes..."
          className={`${inputClass} resize-none`}
        />
        {errors.cardiologica_estudiosAnteriores && (
          <p className="mt-1 text-xs text-red-600">
            {errors.cardiologica_estudiosAnteriores.message}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="cardiologica_diagnostico" className={labelClass}>Diagnóstico</label>
        <textarea
          id="cardiologica_diagnostico"
          {...register('cardiologica_diagnostico')}
          rows={2}
          placeholder="Diagnóstico cardiológico..."
          className={`${inputClass} resize-none`}
        />
        {errors.cardiologica_diagnostico && (
          <p className="mt-1 text-xs text-red-600">{errors.cardiologica_diagnostico.message}</p>
        )}
      </div>
      <div>
        <label htmlFor="cardiologica_observaciones" className={labelClass}>Observaciones (Cardiología)</label>
        <textarea
          id="cardiologica_observaciones"
          {...register('cardiologica_observaciones')}
          rows={2}
          placeholder="Observaciones adicionales del área cardiológica..."
          className={`${inputClass} resize-none`}
        />
        {errors.cardiologica_observaciones && (
          <p className="mt-1 text-xs text-red-600">{errors.cardiologica_observaciones.message}</p>
        )}
      </div>
    </div>
  );
}
