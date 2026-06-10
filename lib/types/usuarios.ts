export type UsuarioActivo = {
  id: string
  firstName: string
  lastName: string
  email: string
  rol: string
  lastSignInAt: Date | null
  createdAt: Date
  status: 'activo'
}

export type UsuarioPendiente = {
  id: string
  firstName: string
  lastName: string
  email: string
  rol: string
  createdAt: Date
  status: 'pendiente'
}

export type Usuario = UsuarioActivo | UsuarioPendiente
