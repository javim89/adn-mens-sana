/**
 * Cálculo puro de las sumatorias antropométricas.
 * Sin dependencias de server/DB: el cliente lo importa para el cálculo en vivo
 * y el server lo usa como fuente de verdad al persistir.
 */

export interface AntropometriaMediciones {
  peso?: number;
  talla?: number;
  pliegueTriceps?: number;
  pliegueSubescapular?: number;
  pliegueSupraespinal?: number;
  pliegueAbdominal?: number;
  pliegueMuslo?: number;
  plieguePantorrilla?: number;
}

export interface AntropometriaSumatorias {
  imc?: number;
  sumatoriaPliegues?: number;
}

const PLIEGUE_KEYS = [
  'pliegueTriceps',
  'pliegueSubescapular',
  'pliegueSupraespinal',
  'pliegueAbdominal',
  'pliegueMuslo',
  'plieguePantorrilla',
] as const;

function isValidNumber(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function computeAntropometriaSumatorias(
  data: AntropometriaMediciones,
): AntropometriaSumatorias {
  let imc: number | undefined;
  if (isValidNumber(data.peso) && isValidNumber(data.talla) && data.talla !== 0) {
    const tallaMetros = data.talla / 100;
    imc = Math.round((data.peso / (tallaMetros * tallaMetros)) * 10) / 10;
  }

  const pliegues = PLIEGUE_KEYS.map((k) => data[k]).filter(isValidNumber);
  const sumatoriaPliegues =
    pliegues.length > 0 ? pliegues.reduce((acc, n) => acc + n, 0) : undefined;

  return { imc, sumatoriaPliegues };
}
