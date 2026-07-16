import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { SeguimientoExtendedFormValues } from '../SeguimientoForm';

interface Props {
  register: UseFormRegister<SeguimientoExtendedFormValues>;
  errors: FieldErrors<SeguimientoExtendedFormValues>;
}

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30';

const labelClass = 'block text-sm font-medium text-[#1C1C1C] mb-1.5';

const sectionTitleClass = 'text-xs font-semibold uppercase text-[#6B7280] tracking-wide mb-3';

export function TraumatologiaSection({ register, errors }: Props) {
  return (
    <div className="space-y-5">
      {/* Estabilidad */}
      <div>
        <p className={sectionTitleClass}>Estabilidad</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="traumatologia_estabilidadHombro" className={labelClass}>Hombro</label>
            <input
              id="traumatologia_estabilidadHombro"
              type="text"
              {...register('traumatologia_estabilidadHombro')}
              className={inputClass}
              placeholder="Ej: Normal"
            />
            {errors.traumatologia_estabilidadHombro && (
              <p className="mt-1 text-xs text-red-600">
                {errors.traumatologia_estabilidadHombro.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="traumatologia_estabilidadRodilla" className={labelClass}>Rodilla</label>
            <input
              id="traumatologia_estabilidadRodilla"
              type="text"
              {...register('traumatologia_estabilidadRodilla')}
              className={inputClass}
              placeholder="Ej: Normal"
            />
            {errors.traumatologia_estabilidadRodilla && (
              <p className="mt-1 text-xs text-red-600">
                {errors.traumatologia_estabilidadRodilla.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="traumatologia_estabilidadTobillo" className={labelClass}>Tobillo</label>
            <input
              id="traumatologia_estabilidadTobillo"
              type="text"
              {...register('traumatologia_estabilidadTobillo')}
              className={inputClass}
              placeholder="Ej: Normal"
            />
            {errors.traumatologia_estabilidadTobillo && (
              <p className="mt-1 text-xs text-red-600">
                {errors.traumatologia_estabilidadTobillo.message}
              </p>
            )}
          </div>
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* Movilidad */}
      <div>
        <p className={sectionTitleClass}>Movilidad</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="traumatologia_movilidadHombro" className={labelClass}>Hombro</label>
            <input
              id="traumatologia_movilidadHombro"
              type="text"
              {...register('traumatologia_movilidadHombro')}
              className={inputClass}
              placeholder="Ej: Completa"
            />
          </div>
          <div>
            <label htmlFor="traumatologia_movilidadCadera" className={labelClass}>Cadera</label>
            <input
              id="traumatologia_movilidadCadera"
              type="text"
              {...register('traumatologia_movilidadCadera')}
              className={inputClass}
              placeholder="Ej: Completa"
            />
          </div>
          <div>
            <label htmlFor="traumatologia_movilidadRodilla" className={labelClass}>Rodilla</label>
            <input
              id="traumatologia_movilidadRodilla"
              type="text"
              {...register('traumatologia_movilidadRodilla')}
              className={inputClass}
              placeholder="Ej: 0-130°"
            />
          </div>
          <div>
            <label htmlFor="traumatologia_movilidadTobillo" className={labelClass}>Tobillo</label>
            <input
              id="traumatologia_movilidadTobillo"
              type="text"
              {...register('traumatologia_movilidadTobillo')}
              className={inputClass}
              placeholder="Ej: Completa"
            />
          </div>
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* Otros */}
      <div>
        <p className={sectionTitleClass}>Otros</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="traumatologia_discrepanciaAsimetria" className={labelClass}>Discrepancia / Asimetría</label>
            <input
              id="traumatologia_discrepanciaAsimetria"
              type="text"
              {...register('traumatologia_discrepanciaAsimetria')}
              className={inputClass}
              placeholder="Ej: Sin discrepancia"
            />
          </div>
          <div>
            <label htmlFor="traumatologia_postura" className={labelClass}>Postura</label>
            <input
              id="traumatologia_postura"
              type="text"
              {...register('traumatologia_postura')}
              className={inputClass}
              placeholder="Ej: Normal"
            />
          </div>
          <div>
            <label htmlFor="traumatologia_laxitud" className={labelClass}>Laxitud</label>
            <input
              id="traumatologia_laxitud"
              type="text"
              {...register('traumatologia_laxitud')}
              className={inputClass}
              placeholder="Ej: Grado I"
            />
          </div>
          <div>
            <label htmlFor="traumatologia_podoscopia" className={labelClass}>Podoscopia</label>
            <input
              id="traumatologia_podoscopia"
              type="text"
              {...register('traumatologia_podoscopia')}
              className={inputClass}
              placeholder="Ej: Pie plano leve"
            />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="traumatologia_observaciones" className={labelClass}>Observaciones (Traumatología)</label>
        <textarea
          id="traumatologia_observaciones"
          {...register('traumatologia_observaciones')}
          rows={3}
          placeholder="Notas adicionales del examen traumatológico..."
          className={`${inputClass} resize-none`}
        />
      </div>
    </div>
  );
}
