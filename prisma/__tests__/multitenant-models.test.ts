import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { AppRole } from '@/lib/generated/prisma/client'
import { ROLES_PERMITIDOS } from '@/lib/roles'

// Tests de schema — no requieren conexión a la base.
// Verifican que cada tabla raíz cuelgue de un club y que los uniques de negocio
// sean por club: un unique global haría chocar los datos de dos clubes.

const schema = readFileSync(
  path.resolve(__dirname, '..', 'schema.prisma'),
  'utf8'
)

function modelBlock(name: string): string {
  const match = schema.match(new RegExp(`\\nmodel ${name} \\{([\\s\\S]*?)\\n\\}`))
  if (!match) throw new Error(`El modelo ${name} no está declarado en schema.prisma`)
  return match[1]
}

const RAICES = [
  'Deportista',
  'Disciplina',
  'Categoria',
  'Equipo',
  'DiaCalendario',
  'EventoTorneo',
  'Turno',
  'Seguimiento',
  'Entrenamiento',
  'Convocatoria',
  'InsightsDashboard',
  'Triage',
  'EntregaComida',
]

describe('Modelos multi-tenant', () => {
  describe.each(RAICES)('%s (raíz)', (modelo) => {
    const block = modelBlock(modelo)

    it('tiene clubId mapeado a club_id', () => {
      expect(block).toMatch(/clubId\s+String\s+.*@map\("club_id"\)/)
    })

    it('tiene la relación con Club', () => {
      expect(block).toMatch(/club\s+Club\s+@relation\(fields: \[clubId\], references: \[id\]\)/)
    })
  })

  it('los uniques de negocio son por club', () => {
    expect(modelBlock('Deportista')).toContain('@@unique([clubId, dni])')
    expect(modelBlock('Deportista')).toContain('@@unique([clubId, email])')
    expect(modelBlock('Equipo')).toContain('@@unique([clubId, nombre])')
    expect(modelBlock('Categoria')).toContain('@@unique([clubId, nombre])')
    expect(modelBlock('Disciplina')).toContain('@@unique([clubId, nombre])')
    expect(modelBlock('Disciplina')).toContain('@@unique([clubId, codigo])')
    expect(modelBlock('DiaCalendario')).toContain('@@unique([clubId, fecha])')
    expect(modelBlock('InsightsDashboard')).toContain('@@unique([clubId, slug])')
  })

  it('no quedan uniques globales en los campos que pasaron a ser por club', () => {
    expect(modelBlock('Deportista')).not.toMatch(/\bdni\s+String\s+@unique/)
    expect(modelBlock('Deportista')).not.toMatch(/\bemail\s+String\?\s+@unique/)
    expect(modelBlock('Equipo')).not.toMatch(/\bnombre\s+String\s+@unique/)
    expect(modelBlock('Categoria')).not.toMatch(/\bnombre\s+String\s+@unique/)
    expect(modelBlock('Disciplina')).not.toMatch(/\b(nombre|codigo)\s+String\s+@unique/)
    expect(modelBlock('DiaCalendario')).not.toMatch(/\bfecha\s+DateTime\s+@unique/)
  })

  it('la foto sigue siendo única global (la key de S3 no se comparte)', () => {
    expect(modelBlock('Deportista')).toMatch(/fotoKey\s+String\?\s+@unique/)
  })

  it('indexa las raíces que se leen por club y fecha', () => {
    expect(modelBlock('Entrenamiento')).toContain('@@index([clubId, fecha])')
    expect(modelBlock('Seguimiento')).toContain('@@index([clubId, fecha])')
    expect(modelBlock('Turno')).toContain('@@index([clubId, fecha])')
    expect(modelBlock('EntregaComida')).toContain('@@index([clubId, fecha, lugar])')
    expect(modelBlock('Triage')).toContain('@@index([clubId, calculatedAt])')
  })

  describe('Membresia', () => {
    const block = modelBlock('Membresia')

    it('es única por usuario y club', () => {
      expect(block).toContain('@@unique([userId, clubId])')
      expect(block).toContain('@@map("membresias")')
    })

    it('se borra con el club', () => {
      expect(block).toMatch(/onDelete: Cascade/)
    })
  })

  it('Invitacion guarda el hash del token, no el token', () => {
    const block = modelBlock('Invitacion')
    expect(block).toMatch(/tokenHash\s+String\s+@unique @map\("token_hash"\)/)
    expect(block).not.toMatch(/\btoken\s+String/)
  })

  it('el enum AppRole coincide con los roles de la app', () => {
    expect(Object.values(AppRole).sort()).toEqual([...ROLES_PERMITIDOS].sort())
  })
})
