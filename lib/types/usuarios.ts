export type UsuarioActivo = {
  id: string
  firstName: string
  lastName: string
  email: string
  rol: string
  /** `publicMetadata.lugarRetiro`. Solo lo usan los `responsable_viandas`. */
  lugarRetiro: string | null
  lastSignInAt: Date | null
  createdAt: Date
  status: 'activo'
  disabled: boolean
}

export type UsuarioPendiente = {
  id: string
  firstName: string
  lastName: string
  email: string
  rol: string
  lugarRetiro: string | null
  createdAt: Date
  status: 'pendiente'
}

export type Usuario = UsuarioActivo | UsuarioPendiente
