import { prisma } from '@/lib/db';

export type GrupoCategoria = 'CUARTA_QUINTA_SEXTA' | 'SEPTIMA_OCTAVA_NOVENA';
export type TipoDia = 'TORNEO' | 'RECESO' | 'RECUPERO' | 'SIN_ACTIVIDAD';
export type EstadoEvento = 'PROGRAMADO' | 'SUSPENDIDO' | 'REPROGRAMADO';

export interface CalendarioCategoria {
  id: string;
  nombre: string; // "4ta"
  grupo: GrupoCategoria;
}

export interface CalendarioDia {
  fecha: string; // 'YYYY-MM-DD'
  tipo: TipoDia;
  numeroFecha: number | null;
}

export interface CalendarioEvento {
  id: string;
  fecha: string; // 'YYYY-MM-DD' del día
  categoriaId: string;
  categoriaNombre: string; // "4ta"
  grupo: GrupoCategoria;
  local: string; // local.nombre
  visitante: string; // visitante.nombre
  estado: EstadoEvento;
}

export interface CalendarioData {
  categorias: CalendarioCategoria[];
  dias: CalendarioDia[];
  eventos: CalendarioEvento[];
}

/**
 * Serializa un `@db.Date` de Prisma a `YYYY-MM-DD` SIN corrimiento de timezone.
 *
 * Prisma devuelve un `Date` a medianoche UTC para columnas `@db.Date`. Usamos los
 * componentes UTC (`toISOString().slice(0, 10)`) para extraer el día exacto sin que
 * la conversión a hora local desplace la fecha un día hacia atrás/adelante.
 */
export function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// La pertenencia 4-5-6 / 7-8-9 ya no vive en la DB (se quitó la columna `grupo`).
// Se deriva del nombre de la categoría para el fixture del calendario.
const GRUPO_456 = new Set(['4ta', '5ta', '6ta']);

function grupoDeCategoria(nombre: string): GrupoCategoria {
  return GRUPO_456.has(nombre) ? 'CUARTA_QUINTA_SEXTA' : 'SEPTIMA_OCTAVA_NOVENA';
}

export async function getCalendarioData(): Promise<CalendarioData> {
  const [categoriasRaw, diasRaw, eventosRaw] = await Promise.all([
    prisma.categoria.findMany({
      orderBy: { orden: 'asc' },
    }),
    prisma.diaCalendario.findMany({
      orderBy: { fecha: 'asc' },
    }),
    prisma.eventoTorneo.findMany({
      include: { dia: true, categoria: true, local: true, visitante: true },
      orderBy: { dia: { fecha: 'asc' } },
    }),
  ]);

  const categorias: CalendarioCategoria[] = categoriasRaw.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    grupo: grupoDeCategoria(c.nombre),
  }));

  const dias: CalendarioDia[] = diasRaw.map((d) => ({
    fecha: toDateString(d.fecha),
    tipo: d.tipo as TipoDia,
    numeroFecha: d.numeroFecha ?? null,
  }));

  const eventos: CalendarioEvento[] = eventosRaw.map((e) => ({
    id: e.id,
    fecha: toDateString(e.dia.fecha),
    categoriaId: e.categoriaId,
    categoriaNombre: e.categoria.nombre,
    grupo: grupoDeCategoria(e.categoria.nombre),
    local: e.local.nombre,
    visitante: e.visitante.nombre,
    estado: e.estado as EstadoEvento,
  }));

  return { categorias, dias, eventos };
}
