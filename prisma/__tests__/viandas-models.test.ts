import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import type { EntregaComida } from '@/lib/generated/prisma/client'
import { TipoComida, LugarRetiro } from '@/lib/generated/prisma/enums'

// Tests de schema — no requieren conexión a la base.
// Verifican el modelo del módulo de Viandas y el desdoblamiento de recibeVianda
// en recibeAlmuerzo + recibeCena.

const schema = readFileSync(
  path.resolve(__dirname, '..', 'schema.prisma'),
  'utf8'
)

function modelBlock(name: string): string {
  const match = schema.match(new RegExp(`\\nmodel ${name} \\{([\\s\\S]*?)\\n\\}`))
  if (!match) throw new Error(`El modelo ${name} no está declarado en schema.prisma`)
  return match[1]
}

function enumBlock(name: string): string {
  const match = schema.match(new RegExp(`\\nenum ${name} \\{([\\s\\S]*?)\\n\\}`))
  if (!match) throw new Error(`El enum ${name} no está declarado en schema.prisma`)
  return match[1]
}

describe('Enums Viandas', () => {
  it('TipoComida declara las cuatro comidas', () => {
    const block = enumBlock('TipoComida')
    expect(block.match(/^\s+\w+$/gm)?.map((l) => l.trim())).toEqual([
      'DESAYUNO',
      'ALMUERZO',
      'MERIENDA',
      'CENA',
    ])
  })

  it('LugarRetiro declara los tres lugares del club', () => {
    const block = enumBlock('LugarRetiro')
    expect(block.match(/^\s+\w+$/gm)?.map((l) => l.trim())).toEqual([
      'BOSQUESITO',
      'SEDE',
      'ESTANCIA_CHICA',
    ])
  })

  it('expone los enums generados por Prisma Client', () => {
    expect(TipoComida.ALMUERZO).toBe('ALMUERZO')
    expect(LugarRetiro.ESTANCIA_CHICA).toBe('ESTANCIA_CHICA')
  })
})

describe('EntregaComida', () => {
  const block = modelBlock('EntregaComida')

  it('mapea a la tabla entregas_comida', () => {
    expect(block).toContain('@@map("entregas_comida")')
  })

  it('guarda la fecha como DATE, sin hora', () => {
    expect(block).toMatch(/fecha\s+DateTime\s+@db\.Date/)
  })

  // La presencia de la fila ES el retiro. Un boolean `retirada` habilitaría filas
  // en false, y con eso el @@unique dejaría de garantizar "una sola vez por día".
  it('no tiene un boolean de retirada: la fila es el hecho', () => {
    expect(block).not.toMatch(/retirada/i)
  })

  it('tiene el unique anti-fraude por deportista + fecha + comida', () => {
    expect(block).toContain('@@unique([deportistaId, fecha, comida])')
  })

  it('indexa por fecha+lugar y por responsable', () => {
    expect(block).toContain('@@index([fecha, lugar])')
    expect(block).toContain('@@index([entregadoPor])')
  })

  it('mapea los campos compuestos a snake_case', () => {
    expect(block).toContain('@map("deportista_id")')
    expect(block).toContain('@map("entregado_por")')
    expect(block).toContain('@map("created_at")')
  })

  it('cascadea al borrar el deportista', () => {
    expect(block).toContain(
      '@relation(fields: [deportistaId], references: [id], onDelete: Cascade)'
    )
  })

  it('expone el tipo generado con comida y lugar tipados por enum', () => {
    const entrega: Pick<EntregaComida, 'comida' | 'lugar' | 'entregadoPor'> = {
      comida: 'CENA',
      lugar: 'BOSQUESITO',
      entregadoPor: 'user_test123',
    }
    expect(entrega.comida).toBe('CENA')
    expect(entrega.lugar).toBe('BOSQUESITO')
  })
})

describe('Deportista', () => {
  it('declara la relación 1:N a entregasComida', () => {
    expect(modelBlock('Deportista')).toMatch(/entregasComida\s+EntregaComida\[\]/)
  })
})

describe('NecesidadesApoyo', () => {
  const block = modelBlock('NecesidadesApoyo')

  it('desdobla la elegibilidad en almuerzo y cena', () => {
    expect(block).toMatch(
      /recibeAlmuerzo\s+Boolean\s+@default\(false\) @map\("recibe_almuerzo"\)/
    )
    expect(block).toMatch(
      /recibeCena\s+Boolean\s+@default\(false\) @map\("recibe_cena"\)/
    )
  })

  // El flag viejo ya no está en el schema (la columna se dropea post-deploy, en
  // la migración 20260928120100). Si volviera, habría dos fuentes de verdad.
  it('ya no declara recibeVianda', () => {
    expect(block).not.toMatch(/recibeVianda/)
    expect(block).not.toMatch(/recibe_vianda/)
  })
})
