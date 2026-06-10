'use client';

import { useState, useTransition, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import DeportistaFormTabs, { type TabId } from './DeportistaFormTabs';
import TabPersonal from './tabs/TabPersonal';
import TabDeportivo from './tabs/TabDeportivo';
import TabEscolar from './tabs/TabEscolar';
import TabSocial from './tabs/TabSocial';
import { createDeportista, updateDeportista } from '@/lib/actions/deportistas';
import type { DeportistaFormData, DeportistaWithRelations } from '@/lib/types/deportistas';

interface DeportistaFormProps {
  mode: 'create' | 'edit';
  initialData?: DeportistaWithRelations;
}

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

type FieldErrors = Partial<Record<string, string>>;

function validate(data: DeportistaFormData): FieldErrors {
  const errors: FieldErrors = {};

  if (!data.apellido?.trim()) errors.apellido = 'El apellido es requerido';
  if (!data.nombre?.trim()) errors.nombre = 'El nombre es requerido';
  if (!data.dni?.trim()) {
    errors.dni = 'El DNI es requerido';
  } else if (!/^\d{7,8}$/.test(data.dni.trim())) {
    errors.dni = 'El DNI debe tener 7 u 8 dígitos';
  }
  if (!data.fechaNacimiento) {
    errors.fechaNacimiento = 'La fecha de nacimiento es requerida';
  } else if (new Date(data.fechaNacimiento) > new Date()) {
    errors.fechaNacimiento = 'La fecha no puede ser futura';
  }

  return errors;
}

const PERSONAL_FIELDS = ['apellido', 'nombre', 'dni', 'fechaNacimiento'];

export default function DeportistaForm({ mode, initialData }: DeportistaFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<TabId>('personal');
  const [formData, setFormData] = useState<DeportistaFormData>(() =>
    buildInitialData(initialData),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  function patch(update: Partial<DeportistaFormData>) {
    setFormData((prev) => ({ ...prev, ...update }));
  }

  function getTabsWithErrors(errs: FieldErrors): Partial<Record<TabId, boolean>> {
    const result: Partial<Record<TabId, boolean>> = {};
    for (const key of Object.keys(errs)) {
      if (PERSONAL_FIELDS.includes(key)) {
        result.personal = true;
      }
    }
    return result;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationErrors = validate(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Switch to the first tab with errors
      const tabs = getTabsWithErrors(validationErrors);
      if (tabs.personal) setActiveTab('personal');
      return;
    }
    setErrors({});
    setGlobalError(null);

    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createDeportista(formData)
          : await updateDeportista(initialData!.id, formData);

      if (result.success) {
        const id = (result as { success: true; id: string }).id ?? initialData?.id;
        router.push('/deportistas/' + id);
      } else {
        setGlobalError((result as { success: false; error: string }).error);
      }
    });
  }

  const tabsWithErrors = getTabsWithErrors(errors);

  return (
    <form onSubmit={handleSubmit} noValidate>
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
            <TabPersonal data={formData} errors={errors} onChange={patch} />
          )}
          {activeTab === 'deportivo' && (
            <TabDeportivo data={formData} errors={errors} onChange={patch} />
          )}
          {activeTab === 'escolar' && (
            <TabEscolar data={formData} onChange={patch} />
          )}
          {activeTab === 'social' && (
            <TabSocial data={formData} onChange={patch} />
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
