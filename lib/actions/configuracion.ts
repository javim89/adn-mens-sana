'use server';

/**
 * Identidad del club activo (nombre, logo y colores). Solo admin.
 *
 * El logo nuevo ya viene subido: el cliente pide el presign, hace el PUT y recién
 * después llama acá con la key. Esta action valida que la key sea del club de la
 * sesión y que el objeto exista antes de asignarla.
 */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { contextoAccion } from '@/lib/tenant/contexto';
import { actualizarBrandingDelClub } from '@/lib/tenant/clubes';
import { deleteFoto, fotoExiste, keyLogoBorrable, keyLogoEsDelClub } from '@/lib/s3';
import { contraste, normalizarHex } from '@/lib/branding/colores';
import { BLANCO, CONTRASTE_MIN_TEXTO } from '@/lib/branding/tokens';
import {
  NOMBRE_CLUB_MAX,
  NOMBRE_CLUB_MIN,
  type ConfiguracionClubInput,
  type ResultadoConfiguracion,
} from '@/lib/types/configuracion';

const color = (nombre: string) =>
  z
    .string()
    .nullable()
    .transform((valor, ctx) => {
      if (valor === null) return null;
      const hex = normalizarHex(valor);
      if (!hex) {
        ctx.addIssue({ code: 'custom', message: `El color ${nombre} no es un hex válido (#rrggbb)` });
        return z.NEVER;
      }
      return hex;
    });

const schema = z.object({
  nombre: z
    .string()
    .trim()
    .min(NOMBRE_CLUB_MIN, `El nombre tiene que tener al menos ${NOMBRE_CLUB_MIN} caracteres`)
    .max(NOMBRE_CLUB_MAX, `El nombre no puede superar los ${NOMBRE_CLUB_MAX} caracteres`),
  logoKey: z.string().nullable().optional(),
  colorPrimario: color('primario'),
  colorSecundario: color('secundario'),
  colorAcento: color('acento'),
});

/** Primario y secundario llevan texto blanco encima: tienen que llegar a 4.5:1. */
function errorDeContraste(hex: string | null, nombre: string): string | null {
  if (!hex) return null;
  const ratio = contraste(hex, BLANCO);
  if (ratio >= CONTRASTE_MIN_TEXTO) return null;
  return `El color ${nombre} tiene poco contraste con el texto blanco (${ratio.toFixed(1)}:1, mínimo ${CONTRASTE_MIN_TEXTO}:1)`;
}

export async function guardarConfiguracionClub(input: ConfiguracionClubInput): Promise<ResultadoConfiguracion> {
  const acceso = await contextoAccion(['admin']);
  if (!acceso.ok) return { ok: false, error: acceso.error };
  const { clubId, club } = acceso.contexto;

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  const datos = parsed.data;

  const contrasteMal =
    errorDeContraste(datos.colorPrimario, 'primario') ?? errorDeContraste(datos.colorSecundario, 'secundario');
  if (contrasteMal) return { ok: false, error: contrasteMal };

  const logoNuevo = typeof datos.logoKey === 'string' && datos.logoKey !== club.logoKey ? datos.logoKey : null;
  if (logoNuevo) {
    if (!keyLogoEsDelClub(logoNuevo, clubId)) return { ok: false, error: 'El logo no es válido' };
    try {
      if (!(await fotoExiste(logoNuevo))) return { ok: false, error: 'No encontramos el logo subido. Probá de nuevo' };
    } catch (error) {
      console.error('guardarConfiguracionClub fotoExiste error:', error);
      return { ok: false, error: 'No se pudo verificar el logo. Probá de nuevo' };
    }
  }

  const cambiaLogo = datos.logoKey !== undefined && datos.logoKey !== club.logoKey;
  try {
    await actualizarBrandingDelClub(clubId, {
      nombre: datos.nombre,
      colorPrimario: datos.colorPrimario,
      colorSecundario: datos.colorSecundario,
      colorAcento: datos.colorAcento,
      ...(cambiaLogo ? { logoKey: datos.logoKey } : {}),
    });
  } catch (error) {
    console.error('guardarConfiguracionClub error:', error);
    return { ok: false, error: 'No se pudo guardar la configuración' };
  }

  // El logo anterior se borra recién con la DB ya actualizada, y solo si es de este
  // club y uno subido desde acá (el legacy de Gimnasia se conserva).
  if (cambiaLogo && club.logoKey && keyLogoBorrable(club.logoKey, clubId)) {
    await deleteFoto(club.logoKey);
  }

  revalidatePath('/', 'layout');
  return { ok: true };
}
