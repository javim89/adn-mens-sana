/**
 * Client-side fetch helpers for the Deportistas JSON:API routes.
 * Used by TanStack Query hooks in Client Components.
 */

import type { JsonApiCollection, JsonApiSingle } from '@/lib/types/jsonapi';
import type { DeportistaFormData } from '@/lib/types/deportistas';
import type {
  Disciplina,
  Categoria,
  EstadoDeportista,
  Genero,
  ActividadComplementaria,
  NivelEstudio,
  SituacionLaboral,
  MedioTransporte,
  CondicionVivienda,
  DificultadAlimentacion,
  TipoApoyo,
  Servicio,
  EnfermedadPreexistente,
  AntecedenteEnfermedadFamiliar,
} from '@/lib/generated/prisma/enums';

// ---------------------------------------------------------------------------
// Attribute types (mirrors Prisma model shapes, without `id`)
// ---------------------------------------------------------------------------

export type DeportistaListAttributes = {
  nombre: string;
  apellido: string;
  dni: string;
  disciplina: Disciplina | null;
  categoria: Categoria | null;
  estado: EstadoDeportista;
  fechaIngreso: string | null;
};

export type DeportistaDetailAttributes = {
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string;
  provincia: string | null;
  ciudad: string | null;
  genero: Genero | null;
  telefono: string | null;
  email: string | null;
  domicilioActual: string | null;
  nacionalidad: string | null;
  contactoEmergencia: string | null;
  vivePensionClub: boolean;
  vivePensionExterna: boolean;
  observaciones: string | null;
  disciplina: Disciplina | null;
  categoria: Categoria | null;
  posicion: string | null;
  estado: EstadoDeportista;
  actividadComplementaria: ActividadComplementaria | null;
  fechaIngreso: string | null;
  esRepresentante: boolean;
  clubesAnteriores: Array<{ id: string; nombre: string; periodo: string | null }>;
  historiaDeportiva: Array<{ id: string; descripcion: string; fecha: string }>;
  datosEscolares: {
    id: string;
    nivelEstudio: NivelEstudio | null;
    nombreColegio: string | null;
    anoCursa: number | null;
    materiasAdeudadas: string | null;
  } | null;
  datosSociales: {
    id: string;
    trabaja: boolean | null;
    situacionLaboralHogar: SituacionLaboral | null;
    conQuienVive: string | null;
    composicionGrupoFamiliar: string | null;
  } | null;
  viviendaFamiliar: {
    id: string;
    personasDependientes: number | null;
    medioTransporte: MedioTransporte | null;
    condicionVivienda: CondicionVivienda | null;
    cuentaConHabitaciones: boolean | null;
    servicios: Array<{ id: string; servicio: Servicio }>;
  } | null;
  datosFamiliares: {
    id: string;
    padreNombre: string | null;
    padreApellido: string | null;
    padreNacionalidad: string | null;
    padreOcupacion: string | null;
    madreNombre: string | null;
    madreApellido: string | null;
    madreNacionalidad: string | null;
    madreOcupacion: string | null;
  } | null;
  necesidadesApoyo: {
    id: string;
    dificultadAlimentacion: DificultadAlimentacion | null;
    recibeVianda: boolean;
    esSocio: boolean;
    apoyosRequeridos: Array<{ id: string; tipo: TipoApoyo }>;
  } | null;
  datosSalud: {
    id: string;
    grupoSanguineo: string | null;
    horasSuenio: string | null;
    obraSocial: string | null;
    antecedenteMuerteSubitaFamiliar: boolean | null;
    antecedentesQuirurgicos: string | null;
    medicacionCronica: string | null;
    historialLesiones: string | null;
    enfermedadesPreexistentes: Array<{ id: string; enfermedad: EnfermedadPreexistente }>;
    antecedentesEnfermedadesFam: Array<{ id: string; antecedente: AntecedenteEnfermedadFamiliar }>;
  } | null;
};

// ---------------------------------------------------------------------------
// Query param type for list endpoint
// ---------------------------------------------------------------------------

export type FetchDeportistasParams = {
  'page[number]'?: number;
  'page[size]'?: number;
  'filter[search]'?: string;
  'filter[disciplina]'?: string;
  'filter[categoria]'?: string;
  'filter[estado]'?: string;
  sort?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const JSON_API_CONTENT_TYPE = 'application/vnd.api+json';

async function throwIfNotOk(res: Response): Promise<void> {
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.errors?.[0]?.detail) {
        message = body.errors[0].detail;
      } else if (body?.errors?.[0]?.title) {
        message = body.errors[0].title;
      }
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * GET /api/deportistas
 */
export async function fetchDeportistas(
  params: FetchDeportistasParams = {},
): Promise<JsonApiCollection<DeportistaListAttributes>> {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      qs.set(key, String(value));
    }
  }
  const query = qs.toString() ? `?${qs.toString()}` : '';
  const res = await fetch(`/api/deportistas${query}`, {
    headers: { Accept: JSON_API_CONTENT_TYPE },
  });
  await throwIfNotOk(res);
  return res.json() as Promise<JsonApiCollection<DeportistaListAttributes>>;
}

/**
 * GET /api/deportistas/:id
 */
export async function fetchDeportista(
  id: string,
): Promise<JsonApiSingle<DeportistaDetailAttributes>> {
  const res = await fetch(`/api/deportistas/${id}`, {
    headers: { Accept: JSON_API_CONTENT_TYPE },
  });
  await throwIfNotOk(res);
  return res.json() as Promise<JsonApiSingle<DeportistaDetailAttributes>>;
}

/**
 * POST /api/deportistas
 */
export async function createDeportista(
  data: DeportistaFormData,
): Promise<JsonApiSingle<DeportistaDetailAttributes>> {
  const res = await fetch('/api/deportistas', {
    method: 'POST',
    headers: {
      'Content-Type': JSON_API_CONTENT_TYPE,
      Accept: JSON_API_CONTENT_TYPE,
    },
    body: JSON.stringify({
      data: {
        type: 'deportistas',
        attributes: data,
      },
    }),
  });
  await throwIfNotOk(res);
  return res.json() as Promise<JsonApiSingle<DeportistaDetailAttributes>>;
}

/**
 * PATCH /api/deportistas/:id
 */
export async function updateDeportista(
  id: string,
  data: DeportistaFormData,
): Promise<JsonApiSingle<DeportistaDetailAttributes> | null> {
  const res = await fetch(`/api/deportistas/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': JSON_API_CONTENT_TYPE,
      Accept: JSON_API_CONTENT_TYPE,
    },
    body: JSON.stringify({
      data: {
        type: 'deportistas',
        id,
        attributes: data,
      },
    }),
  });
  await throwIfNotOk(res);
  if (res.status === 204) return null;
  return res.json() as Promise<JsonApiSingle<DeportistaDetailAttributes>>;
}

/**
 * DELETE /api/deportistas/:id
 */
export async function deleteDeportista(id: string): Promise<void> {
  const res = await fetch(`/api/deportistas/${id}`, {
    method: 'DELETE',
    headers: { Accept: JSON_API_CONTENT_TYPE },
  });
  await throwIfNotOk(res);
}
