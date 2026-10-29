/**
 * Errores de la capa multi-tenant.
 *
 * Son clases propias (no `Error` a secas) para que las actions y las API routes
 * puedan distinguir "esto es de otro club" de un error de base cualquiera y
 * responder 404/403 sin filtrar si la fila existe.
 */

/** Una escritura apunta a una fila de otro club, o intenta mover una fila de club. */
export class CrossTenantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CrossTenantError';
  }
}

/**
 * El cliente acotado recibió una operación que no sabe acotar: un modelo global,
 * uno sin clasificar en `TENANT_SCOPE` o una operación desconocida. Falla cerrado
 * a propósito: es preferible un error a devolver filas de todos los clubes.
 */
export class TenantScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantScopeError';
  }
}

/** Se pidió el cliente del club sin una sesión con club activo. */
export class SinContextoError extends Error {
  constructor(message = 'No hay un club activo para esta sesión') {
    super(message);
    this.name = 'SinContextoError';
  }
}

/** Lo que ve el usuario cuando una operación apunta a una fila de otro club. */
export const NO_ENCONTRADO = 'No encontrado';

/**
 * Texto de error para devolver desde una action. Un `CrossTenantError` se informa
 * como "no encontrado": decir "es de otro club" confirmaría que la fila existe.
 */
export function mensajeDeError(error: unknown, fallback: string): string {
  if (error instanceof CrossTenantError) return NO_ENCONTRADO;
  return error instanceof Error ? error.message : fallback;
}
