import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { SeguimientoExtendedFormValues } from '../SeguimientoForm';

interface Props {
  register: UseFormRegister<SeguimientoExtendedFormValues>;
  errors: FieldErrors<SeguimientoExtendedFormValues>;
}

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30';

const labelClass = 'block text-sm font-medium text-[#1C1C1C] mb-1.5';

export function HistoriaClinicaSection({ register, errors }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="historiaClinica_tensionArterial" className={labelClass}>Tensión arterial</label>
          <input
            id="historiaClinica_tensionArterial"
            type="text"
            {...register('historiaClinica_tensionArterial')}
            className={inputClass}
            placeholder="Ej: 120/80 mmHg"
          />
          {errors.historiaClinica_tensionArterial && (
            <p className="mt-1 text-xs text-red-600">
              {errors.historiaClinica_tensionArterial.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="historiaClinica_auscultacionPulmonar" className={labelClass}>Auscultación pulmonar</label>
          <input
            id="historiaClinica_auscultacionPulmonar"
            type="text"
            {...register('historiaClinica_auscultacionPulmonar')}
            className={inputClass}
            placeholder="Ej: Normal"
          />
          {errors.historiaClinica_auscultacionPulmonar && (
            <p className="mt-1 text-xs text-red-600">
              {errors.historiaClinica_auscultacionPulmonar.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="historiaClinica_avOjoDerecho" className={labelClass}>AV Ojo Derecho</label>
          <input
            id="historiaClinica_avOjoDerecho"
            type="text"
            {...register('historiaClinica_avOjoDerecho')}
            className={inputClass}
            placeholder="Ej: 20/20"
          />
          {errors.historiaClinica_avOjoDerecho && (
            <p className="mt-1 text-xs text-red-600">
              {errors.historiaClinica_avOjoDerecho.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="historiaClinica_avOjoIzquierdo" className={labelClass}>AV Ojo Izquierdo</label>
          <input
            id="historiaClinica_avOjoIzquierdo"
            type="text"
            {...register('historiaClinica_avOjoIzquierdo')}
            className={inputClass}
            placeholder="Ej: 20/20"
          />
          {errors.historiaClinica_avOjoIzquierdo && (
            <p className="mt-1 text-xs text-red-600">
              {errors.historiaClinica_avOjoIzquierdo.message}
            </p>
          )}
        </div>
      </div>
      <div>
        <label htmlFor="historiaClinica_diagnostico" className={labelClass}>Diagnóstico</label>
        <input
          id="historiaClinica_diagnostico"
          type="text"
          {...register('historiaClinica_diagnostico')}
          className={inputClass}
          placeholder="Diagnóstico principal..."
        />
        {errors.historiaClinica_diagnostico && (
          <p className="mt-1 text-xs text-red-600">
            {errors.historiaClinica_diagnostico.message}
          </p>
        )}
      </div>
    </div>
  );
}
