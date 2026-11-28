import type { EnfermedadPreexistente } from '@/lib/generated/prisma/enums';

type SaludConEnfermedades =
  | { enfermedadesPreexistentes?: readonly { enfermedad: EnfermedadPreexistente }[] | null }
  | null
  | undefined;

/**
 * Si la ficha de salud registra alergias (`EnfermedadPreexistente.ALERGIAS`).
 * Sin ficha de salud da `false`: la UI lo muestra como "No registradas", no "No".
 */
export function tieneAlergias(datosSalud: SaludConEnfermedades): boolean {
  return (datosSalud?.enfermedadesPreexistentes ?? []).some((e) => e.enfermedad === 'ALERGIAS');
}
