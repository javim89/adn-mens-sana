/**
 * Catálogos con los que arranca un club: disciplinas, categorías y qué
 * disciplinas vienen vinculadas a todas las categorías.
 *
 * Los datos viven en `catalogos-default.json` para que los compartan los seeds
 * (`scripts/seed-disciplinas.mjs`, `scripts/seed-categorias.mjs`, que son `.mjs`)
 * y `crearClub` (lib/actions/superadmin.ts). `codigo` es el valor del enum
 * original de disciplina; los nombres son los labels en español.
 */

import catalogos from './catalogos-default.json';

export type DisciplinaDefault = { codigo: string; nombre: string; orden: number };
export type CategoriaDefault = { nombre: string; orden: number };

export const DISCIPLINAS_DEFAULT: DisciplinaDefault[] = catalogos.disciplinas;
export const CATEGORIAS_DEFAULT: CategoriaDefault[] = catalogos.categorias;
/** Códigos de disciplina que se vinculan a todas las categorías (hoy, Fútbol). */
export const DISCIPLINAS_CON_TODAS_LAS_CATEGORIAS: string[] = catalogos.disciplinasConTodasLasCategorias;
