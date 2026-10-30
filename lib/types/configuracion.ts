/** Contrato de `guardarConfiguracionClub` (lib/actions/configuracion.ts). Client-safe. */

export const NOMBRE_CLUB_MIN = 2;
export const NOMBRE_CLUB_MAX = 120;

export interface ConfiguracionClubInput {
  nombre: string;
  /**
   * `undefined` = el logo no cambia; `null` = quitarlo; un string = la key del logo
   * nuevo que el cliente ya subió con `/api/club/logo/presign`.
   */
  logoKey?: string | null;
  /** `#rrggbb`, o `null` para volver al default. */
  colorPrimario: string | null;
  colorSecundario: string | null;
  colorAcento: string | null;
}

export type ResultadoConfiguracion = { ok: true } | { ok: false; error: string };
