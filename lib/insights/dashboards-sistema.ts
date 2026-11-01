/**
 * Dashboards de sistema de Insights ("Panorama general" y "Viandas").
 *
 * Las definiciones viven en `dashboards-sistema.json` para que las compartan el
 * seed (`scripts/seed-insights.mjs`, que es `.mjs` y no puede importar TS) y
 * `crearClub`, que las clona en cada club nuevo. Los `querySpec` usan ids REALES
 * del catálogo (`catalog.ts`); `lib/actions/__tests__/insights.test.ts` los valida.
 *
 * Por qué algunos widgets son como son (en el JSON no hay comentarios):
 * - "Seguimientos del mes" es un KPI del mes: el catálogo no expone medidas con
 *   ventana temporal propia para un "Comparison" mes actual vs. anterior.
 * - Los cortes de Viandas por lugar salen de `viandas_entregas` y no de
 *   cobertura: en cobertura el lugar es NULL en toda fila no retirada.
 * - "Entregas fuera de la ficha" usa `any` de dos grupos `all` para el OR
 *   "almuerzo sin recibe_almuerzo O cena sin recibe_cena". NO es una lista de
 *   errores: /viandas deja entregar cualquier comida a cualquiera a propósito.
 */

import dashboards from './dashboards-sistema.json';

export type WidgetSistema = {
  titulo: string;
  descripcion: string;
  tipo: string;
  querySpec: unknown;
  vizConfig: unknown;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type DashboardSistema = {
  slug: string;
  nombre: string;
  descripcion: string;
  orden: number;
  widgets: WidgetSistema[];
};

export const DASHBOARDS_SISTEMA = dashboards as DashboardSistema[];
