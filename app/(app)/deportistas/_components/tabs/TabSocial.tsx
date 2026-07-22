'use client';

import EnumSelect from '../EnumSelect';
import {
  SITUACION_LABORAL_LABELS,
  MEDIO_TRANSPORTE_LABELS,
  CONDICION_VIVIENDA_LABELS,
  DIFICULTAD_ALIMENTACION_LABELS,
  SERVICIO_LABELS,
  TIPO_APOYO_LABELS,
} from '@/lib/utils/enum-labels';
import { Servicio, TipoApoyo } from '@/lib/generated/prisma/enums';
import type { DeportistaFormData } from '@/lib/types/deportistas';

interface TabSocialProps {
  data: DeportistaFormData;
  onChange: (patch: Partial<DeportistaFormData>) => void;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="sm:col-span-2 text-sm font-semibold uppercase tracking-wide text-[#6B7280] border-b border-gray-100 pb-2 mt-2">
      {children}
    </h3>
  );
}

function Field({
  label,
  id,
  children,
  className = '',
}: {
  label: string;
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="block text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-1"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export default function TabSocial({ data, onChange }: TabSocialProps) {
  const fam = data.datosFamiliares ?? {};
  const soc = data.datosSociales ?? {};
  const viv = data.viviendaFamiliar ?? { servicios: [] };
  const nec = data.necesidadesApoyo ?? { recibeVianda: false, esSocio: false, apoyosRequeridos: [] };

  function patchFam(patch: Partial<NonNullable<DeportistaFormData['datosFamiliares']>>) {
    onChange({ datosFamiliares: { ...fam, ...patch } });
  }
  function patchSoc(patch: Partial<NonNullable<DeportistaFormData['datosSociales']>>) {
    onChange({ datosSociales: { ...soc, ...patch } });
  }
  function patchViv(patch: Partial<NonNullable<DeportistaFormData['viviendaFamiliar']>>) {
    onChange({ viviendaFamiliar: { ...viv, servicios: viv.servicios ?? [], ...patch } });
  }
  function patchNec(patch: Partial<NonNullable<DeportistaFormData['necesidadesApoyo']>>) {
    onChange({
      necesidadesApoyo: {
        ...nec,
        recibeVianda: nec.recibeVianda ?? false,
        esSocio: nec.esSocio ?? false,
        apoyosRequeridos: nec.apoyosRequeridos ?? [],
        ...patch,
      },
    });
  }

  function toggleServicio(s: typeof Servicio[keyof typeof Servicio]) {
    const current = viv.servicios ?? [];
    const updated = current.includes(s) ? current.filter((x) => x !== s) : [...current, s];
    patchViv({ servicios: updated });
  }

  function toggleApoyo(t: typeof TipoApoyo[keyof typeof TipoApoyo]) {
    const current = nec.apoyosRequeridos ?? [];
    const updated = current.includes(t) ? current.filter((x) => x !== t) : [...current, t];
    patchNec({ apoyosRequeridos: updated });
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
      {/* ---- Datos Familiares ---- */}
      <SectionTitle>Datos Familiares</SectionTitle>

      {/* Padre / Madre en 2 sub-columnas */}
      <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        {/* Padre */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-[#1C1C1C] uppercase tracking-wide">Padre</p>
          <div>
            <label htmlFor="padreNombre" className="block text-xs text-[#6B7280] mb-1">Nombre</label>
            <input id="padreNombre" type="text" value={fam.padreNombre ?? ''} onChange={(e) => patchFam({ padreNombre: e.target.value })} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30" />
          </div>
          <div>
            <label htmlFor="padreApellido" className="block text-xs text-[#6B7280] mb-1">Apellido</label>
            <input id="padreApellido" type="text" value={fam.padreApellido ?? ''} onChange={(e) => patchFam({ padreApellido: e.target.value })} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30" />
          </div>
          <div>
            <label htmlFor="padreNacionalidad" className="block text-xs text-[#6B7280] mb-1">Nacionalidad</label>
            <input id="padreNacionalidad" type="text" value={fam.padreNacionalidad ?? ''} onChange={(e) => patchFam({ padreNacionalidad: e.target.value })} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30" />
          </div>
          <div>
            <label htmlFor="padreOcupacion" className="block text-xs text-[#6B7280] mb-1">Ocupación</label>
            <input id="padreOcupacion" type="text" value={fam.padreOcupacion ?? ''} onChange={(e) => patchFam({ padreOcupacion: e.target.value })} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30" />
          </div>
        </div>

        {/* Madre */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-[#1C1C1C] uppercase tracking-wide">Madre</p>
          <div>
            <label htmlFor="madreNombre" className="block text-xs text-[#6B7280] mb-1">Nombre</label>
            <input id="madreNombre" type="text" value={fam.madreNombre ?? ''} onChange={(e) => patchFam({ madreNombre: e.target.value })} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30" />
          </div>
          <div>
            <label htmlFor="madreApellido" className="block text-xs text-[#6B7280] mb-1">Apellido</label>
            <input id="madreApellido" type="text" value={fam.madreApellido ?? ''} onChange={(e) => patchFam({ madreApellido: e.target.value })} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30" />
          </div>
          <div>
            <label htmlFor="madreNacionalidad" className="block text-xs text-[#6B7280] mb-1">Nacionalidad</label>
            <input id="madreNacionalidad" type="text" value={fam.madreNacionalidad ?? ''} onChange={(e) => patchFam({ madreNacionalidad: e.target.value })} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30" />
          </div>
          <div>
            <label htmlFor="madreOcupacion" className="block text-xs text-[#6B7280] mb-1">Ocupación</label>
            <input id="madreOcupacion" type="text" value={fam.madreOcupacion ?? ''} onChange={(e) => patchFam({ madreOcupacion: e.target.value })} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30" />
          </div>
        </div>
      </div>

      {/* ---- Datos Sociales ---- */}
      <SectionTitle>Datos Sociales</SectionTitle>

      <div className="sm:col-span-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            id="trabaja"
            type="checkbox"
            checked={soc.trabaja ?? false}
            onChange={(e) => patchSoc({ trabaja: e.target.checked })}
            className="w-4 h-4 text-[#121A61] rounded border-gray-300"
          />
          <span className="text-sm text-[#1C1C1C]">Trabaja</span>
        </label>
      </div>

      <Field label="Situación laboral del hogar" id="situacionLaboralHogar">
        <EnumSelect
          id="situacionLaboralHogar"
          value={soc.situacionLaboralHogar ?? ''}
          onChange={(v) => patchSoc({ situacionLaboralHogar: v || undefined })}
          options={SITUACION_LABORAL_LABELS}
          placeholder="Seleccionar..."
        />
      </Field>

      <div />

      <Field label="Con quién vive" id="conQuienVive">
        <input
          id="conQuienVive"
          type="text"
          value={soc.conQuienVive ?? ''}
          onChange={(e) => patchSoc({ conQuienVive: e.target.value })}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
        />
      </Field>

      <div />

      <Field label="Composición del grupo familiar" id="composicionGrupoFamiliar" className="sm:col-span-2">
        <textarea
          id="composicionGrupoFamiliar"
          value={soc.composicionGrupoFamiliar ?? ''}
          onChange={(e) => patchSoc({ composicionGrupoFamiliar: e.target.value })}
          rows={3}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30 resize-none"
        />
      </Field>

      {/* ---- Vivienda Familiar ---- */}
      <SectionTitle>Vivienda Familiar</SectionTitle>

      <Field label="Personas dependientes" id="personasDependientes">
        <input
          id="personasDependientes"
          type="number"
          min={0}
          value={viv.personasDependientes ?? ''}
          onChange={(e) => patchViv({ personasDependientes: e.target.value ? Number(e.target.value) : undefined })}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
        />
      </Field>

      <Field label="Medio de transporte" id="medioTransporte">
        <EnumSelect
          id="medioTransporte"
          value={viv.medioTransporte ?? ''}
          onChange={(v) => patchViv({ medioTransporte: v || undefined })}
          options={MEDIO_TRANSPORTE_LABELS}
          placeholder="Seleccionar..."
        />
      </Field>

      <Field label="Condición de vivienda" id="condicionVivienda">
        <EnumSelect
          id="condicionVivienda"
          value={viv.condicionVivienda ?? ''}
          onChange={(v) => patchViv({ condicionVivienda: v || undefined })}
          options={CONDICION_VIVIENDA_LABELS}
          placeholder="Seleccionar..."
        />
      </Field>

      <div className="flex items-center">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            id="cuentaConHabitaciones"
            type="checkbox"
            checked={viv.cuentaConHabitaciones ?? false}
            onChange={(e) => patchViv({ cuentaConHabitaciones: e.target.checked })}
            className="w-4 h-4 text-[#121A61] rounded border-gray-300"
          />
          <span className="text-sm text-[#1C1C1C]">Cuenta con habitaciones propias</span>
        </label>
      </div>

      <div className="sm:col-span-2">
        <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-2">Servicios</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {Object.values(Servicio).map((s) => (
            <label key={s} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={viv.servicios?.includes(s) ?? false}
                onChange={() => toggleServicio(s)}
                className="w-4 h-4 text-[#121A61] rounded border-gray-300"
              />
              <span className="text-sm text-[#1C1C1C]">{SERVICIO_LABELS[s]}</span>
            </label>
          ))}
        </div>
      </div>

      {/* ---- Necesidades de Apoyo ---- */}
      <SectionTitle>Necesidades de Apoyo</SectionTitle>

      <Field label="Dificultad de alimentación" id="dificultadAlimentacion">
        <EnumSelect
          id="dificultadAlimentacion"
          value={nec.dificultadAlimentacion ?? ''}
          onChange={(v) => patchNec({ dificultadAlimentacion: v || undefined })}
          options={DIFICULTAD_ALIMENTACION_LABELS}
          placeholder="Seleccionar..."
        />
      </Field>

      <div />

      <div className="sm:col-span-2 flex flex-wrap gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            id="recibeVianda"
            type="checkbox"
            checked={nec.recibeVianda ?? false}
            onChange={(e) => patchNec({ recibeVianda: e.target.checked })}
            className="w-4 h-4 text-[#121A61] rounded border-gray-300"
          />
          <span className="text-sm text-[#1C1C1C]">Recibe vianda</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            id="esSocio"
            type="checkbox"
            checked={nec.esSocio ?? false}
            onChange={(e) => patchNec({ esSocio: e.target.checked })}
            className="w-4 h-4 text-[#121A61] rounded border-gray-300"
          />
          <span className="text-sm text-[#1C1C1C]">Es socio del club</span>
        </label>
      </div>

      <div className="sm:col-span-2">
        <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-2">Apoyos requeridos</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {Object.values(TipoApoyo).map((t) => (
            <label key={t} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={nec.apoyosRequeridos?.includes(t) ?? false}
                onChange={() => toggleApoyo(t)}
                className="w-4 h-4 text-[#121A61] rounded border-gray-300"
              />
              <span className="text-sm text-[#1C1C1C]">{TIPO_APOYO_LABELS[t]}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
