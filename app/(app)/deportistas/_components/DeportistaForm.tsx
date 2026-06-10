'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import DeportistaFormTabs, { type TabId } from './DeportistaFormTabs';
import TabPersonal from './tabs/TabPersonal';
import TabDeportivo from './tabs/TabDeportivo';
import TabEscolar from './tabs/TabEscolar';
import TabSocial from './tabs/TabSocial';
import { createDeportista, updateDeportista } from '@/lib/api/deportistas';
import type { DeportistaFormData, DeportistaWithRelations } from '@/lib/types/deportistas';

// ---------------------------------------------------------------------------
// Zod schema for client-side validation (partial — only required fields validated)
// ---------------------------------------------------------------------------

const formSchema = z
  .object({
    apellido: z.string().min(1, 'El apellido es requerido'),
    nombre: z.string().min(1, 'El nombre es requerido'),
    dni: z
      .string()
      .min(1, 'El DNI es requerido')
      .regex(/^\d{7,8}$/, 'El DNI debe tener 7 u 8 dígitos'),
    fechaNacimiento: z
      .string()
      .min(1, 'La fecha de nacimiento es requerida')
      .refine((v) => !v || new Date(v) <= new Date(), {
        message: 'La fecha no puede ser futura',
      }),
  })
  .passthrough();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDateString(d: Date | null | undefined): string {
  if (!d) return '';
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildInitialData(d?: DeportistaWithRelations): DeportistaFormData {
  if (!d) {
    return {
      apellido: '',
      nombre: '',
      dni: '',
      fechaNacimiento: '',
      vivePensionClub: false,
      vivePensionExterna: false,
      estado: 'ACTIVO',
      esRepresentante: false,
      clubesAnteriores: [],
    };
  }

  return {
    apellido: d.apellido,
    nombre: d.nombre,
    dni: d.dni,
    fechaNacimiento: toDateString(d.fechaNacimiento),
    provincia: d.provincia ?? undefined,
    ciudad: d.ciudad ?? undefined,
    genero: d.genero ?? undefined,
    telefono: d.telefono ?? undefined,
    email: d.email ?? undefined,
    domicilioActual: d.domicilioActual ?? undefined,
    nacionalidad: d.nacionalidad ?? undefined,
    contactoEmergencia: d.contactoEmergencia ?? undefined,
    vivePensionClub: d.vivePensionClub,
    vivePensionExterna: d.vivePensionExterna,
    observaciones: d.observaciones ?? undefined,
    disciplina: d.disciplina ?? undefined,
    categoria: d.categoria ?? undefined,
    posicion: d.posicion ?? undefined,
    estado: d.estado,
    actividadComplementaria: d.actividadComplementaria ?? undefined,
    fechaIngreso: toDateString(d.fechaIngreso),
    esRepresentante: d.esRepresentante,
    clubesAnteriores: d.clubesAnteriores.map((c: { nombre: string; periodo?: string | null }) => ({
      nombre: c.nombre,
      periodo: c.periodo ?? undefined,
    })),
    datosEscolares: d.datosEscolares
      ? {
          nivelEstudio: d.datosEscolares.nivelEstudio ?? undefined,
          nombreColegio: d.datosEscolares.nombreColegio ?? undefined,
          anoCursa: d.datosEscolares.anoCursa ?? undefined,
          materiasAdeudadas: d.datosEscolares.materiasAdeudadas ?? undefined,
        }
      : undefined,
    datosFamiliares: d.datosFamiliares
      ? {
          padreNombre: d.datosFamiliares.padreNombre ?? undefined,
          padreApellido: d.datosFamiliares.padreApellido ?? undefined,
          padreNacionalidad: d.datosFamiliares.padreNacionalidad ?? undefined,
          padreOcupacion: d.datosFamiliares.padreOcupacion ?? undefined,
          madreNombre: d.datosFamiliares.madreNombre ?? undefined,
          madreApellido: d.datosFamiliares.madreApellido ?? undefined,
          madreNacionalidad: d.datosFamiliares.madreNacionalidad ?? undefined,
          madreOcupacion: d.datosFamiliares.madreOcupacion ?? undefined,
        }
      : undefined,
    datosSociales: d.datosSociales
      ? {
          trabaja: d.datosSociales.trabaja ?? undefined,
          situacionLaboralHogar: d.datosSociales.situacionLaboralHogar ?? undefined,
          conQuienVive: d.datosSociales.conQuienVive ?? undefined,
          composicionGrupoFamiliar: d.datosSociales.composicionGrupoFamiliar ?? undefined,
        }
      : undefined,
    viviendaFamiliar: d.viviendaFamiliar
      ? {
          personasDependientes: d.viviendaFamiliar.personasDependientes ?? undefined,
          medioTransporte: d.viviendaFamiliar.medioTransporte ?? undefined,
          condicionVivienda: d.viviendaFamiliar.condicionVivienda ?? undefined,
          cuentaConHabitaciones: d.viviendaFamiliar.cuentaConHabitaciones ?? undefined,
          servicios: d.viviendaFamiliar.servicios.map((s: { servicio: import('@/lib/generated/prisma/enums').Servicio }) => s.servicio),
        }
      : undefined,
    necesidadesApoyo: d.necesidadesApoyo
      ? {
          dificultadAlimentacion: d.necesidadesApoyo.dificultadAlimentacion ?? undefined,
          recibeVianda: d.necesidadesApoyo.recibeVianda,
          esSocio: d.necesidadesApoyo.esSocio,
          apoyosRequeridos: d.necesidadesApoyo.apoyosRequeridos.map((a: { tipo: import('@/lib/generated/prisma/enums').TipoApoyo }) => a.tipo),
        }
      : undefined,
  };
}

interface DeportistaFormProps {
  mode: 'create' | 'edit';
  initialData?: DeportistaWithRelations;
}

const PERSONAL_FIELDS = ['apellido', 'nombre', 'dni', 'fechaNacimiento'];

export default function DeportistaForm({ mode, initialData }: DeportistaFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('personal');
  const [globalError, setGlobalError] = useState<string | null>(null);

  // React Hook Form — only validates the required personal fields via Zod.
  // The rest of the deeply nested data is managed via watchedData / patchData.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resolver = zodResolver(formSchema) as any;
  const {
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<DeportistaFormData>({
    defaultValues: buildInitialData(initialData),
    resolver,
  });

  // Watch the full form to pass into tab sub-components
  const watchedData = watch();

  function patch(update: Partial<DeportistaFormData>) {
    for (const [key, value] of Object.entries(update)) {
      setValue(key as keyof DeportistaFormData, value as DeportistaFormData[keyof DeportistaFormData]);
    }
  }

  function getTabsWithErrors(
    errs: typeof errors,
  ): Partial<Record<TabId, boolean>> {
    const result: Partial<Record<TabId, boolean>> = {};
    for (const key of Object.keys(errs)) {
      if (PERSONAL_FIELDS.includes(key)) {
        result.personal = true;
      }
    }
    return result;
  }

  const onSubmit = handleSubmit(async (data) => {
    setGlobalError(null);
    try {
      if (mode === 'create') {
        const result = await createDeportista(data);
        router.push('/deportistas/' + result.data.id);
      } else {
        await updateDeportista(initialData!.id, data);
        router.push('/deportistas/' + initialData!.id);
      }
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Error al guardar');
    }
  });

  const tabsWithErrors = getTabsWithErrors(errors);

  // Build a flat errors object for passing to tab components (backwards-compatible)
  const flatErrors: Partial<Record<string, string>> = {};
  for (const [key, err] of Object.entries(errors)) {
    if (err && typeof err === 'object' && 'message' in err) {
      flatErrors[key] = err.message as string;
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 pt-4">
          <DeportistaFormTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabsWithErrors={tabsWithErrors}
          />
        </div>

        <div className="px-6 pb-6">
          {activeTab === 'personal' && (
            <TabPersonal data={watchedData} errors={flatErrors} onChange={patch} />
          )}
          {activeTab === 'deportivo' && (
            <TabDeportivo data={watchedData} errors={flatErrors} onChange={patch} />
          )}
          {activeTab === 'escolar' && (
            <TabEscolar data={watchedData} onChange={patch} />
          )}
          {activeTab === 'social' && (
            <TabSocial data={watchedData} onChange={patch} />
          )}
        </div>

        {globalError && (
          <div className="mx-6 mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {globalError}
          </div>
        )}

        <div className="px-6 pb-6 flex items-center justify-between border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={() => router.push('/deportistas')}
            disabled={isSubmitting}
            className="text-sm text-[#6B7280] hover:text-[#1C1C1C] border border-gray-200 rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-[#121A61] text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-[#1E2A8A] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
