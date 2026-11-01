/**
 * Un miembro del club (tiene `Membresia`). `inactivo` es una membresía
 * desactivada: la cuenta de Clerk sigue viva y puede entrar a otros clubes, pero
 * a este no.
 */
export type UsuarioActivo = {
  /** Clerk userId. */
  id: string
  firstName: string
  lastName: string
  email: string
  rol: string
  /** `Membresia.lugarRetiro`. Solo lo usan los `responsable_viandas`. */
  lugarRetiro: string | null
  lastSignInAt: Date | null
  createdAt: Date
  status: 'activo' | 'inactivo'
}

/**
 * Una invitación al club todavía sin aceptar. `id` es el de la fila de `invitaciones`.
 * `vencida` ya no se puede aceptar, pero se lista para que el admin la reenvíe.
 */
export type UsuarioPendiente = {
  id: string
  firstName: string
  lastName: string
  email: string
  rol: string
  lugarRetiro: string | null
  createdAt: Date
  expira: Date
  status: 'pendiente' | 'vencida'
}

export type Usuario = UsuarioActivo | UsuarioPendiente

export type EstadoUsuario = Usuario['status']

/** El usuario es una invitación (pendiente o vencida), no un miembro. */
export function esInvitacion(usuario: Pick<Usuario, 'status'>): usuario is UsuarioPendiente {
  return usuario.status === 'pendiente' || usuario.status === 'vencida'
}
