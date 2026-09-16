import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import type {
  InsightsDashboard,
  InsightsWidget,
  InsightsFilter,
  InsightsFilterTarget,
} from '@/lib/generated/prisma/client'

// Tests de schema — no requieren conexión a la base.
// Verifican que los 4 modelos del módulo Insights estén declarados con el
// nombre de tabla correcto y el mapeo snake_case de sus campos compuestos.

const schema = readFileSync(
  path.resolve(__dirname, '..', 'schema.prisma'),
  'utf8'
)

function modelBlock(name: string): string {
  const match = schema.match(new RegExp(`\\nmodel ${name} \\{([\\s\\S]*?)\\n\\}`))
  if (!match) throw new Error(`El modelo ${name} no está declarado en schema.prisma`)
  return match[1]
}

describe('Modelos Insights', () => {
  describe('InsightsDashboard', () => {
    const block = modelBlock('InsightsDashboard')

    it('mapea a la tabla insights_dashboards', () => {
      expect(block).toContain('@@map("insights_dashboards")')
    })

    it('tiene id cuid y slug único', () => {
      expect(block).toMatch(/id\s+String\s+@id @default\(cuid\(\)\)/)
      expect(block).toMatch(/slug\s+String\s+@unique/)
    })

    it('mapea los campos compuestos a snake_case', () => {
      expect(block).toContain('@map("es_sistema")')
      expect(block).toContain('@map("creado_por")')
      expect(block).toContain('@map("created_at")')
      expect(block).toContain('@map("updated_at")')
    })

    it('declara las relaciones a widgets y filtros', () => {
      expect(block).toMatch(/widgets\s+InsightsWidget\[\]/)
      expect(block).toMatch(/filtros\s+InsightsFilter\[\]/)
    })
  })

  describe('InsightsWidget', () => {
    const block = modelBlock('InsightsWidget')

    it('mapea a la tabla insights_widgets', () => {
      expect(block).toContain('@@map("insights_widgets")')
    })

    it('guarda querySpec y vizConfig como Json mapeados a snake_case', () => {
      expect(block).toMatch(/querySpec\s+Json\s+@map\("query_spec"\)/)
      expect(block).toMatch(/vizConfig\s+Json\s+@map\("viz_config"\)/)
    })

    it('tiene el layout de la grilla con sus defaults', () => {
      expect(block).toMatch(/x\s+Int\s+@default\(0\)/)
      expect(block).toMatch(/y\s+Int\s+@default\(0\)/)
      expect(block).toMatch(/w\s+Int\s+@default\(6\)/)
      expect(block).toMatch(/h\s+Int\s+@default\(6\)/)
    })

    it('cascadea al borrar el dashboard e indexa por dashboardId', () => {
      expect(block).toContain(
        '@relation(fields: [dashboardId], references: [id], onDelete: Cascade)'
      )
      expect(block).toContain('@@index([dashboardId])')
    })
  })

  describe('InsightsFilter', () => {
    const block = modelBlock('InsightsFilter')

    it('mapea a la tabla insights_filters', () => {
      expect(block).toContain('@@map("insights_filters")')
    })

    it('mapea valorDefault como Json opcional', () => {
      expect(block).toMatch(/valorDefault\s+Json\?\s+@map\("valor_default"\)/)
    })

    it('cascadea al borrar el dashboard e indexa por dashboardId', () => {
      expect(block).toContain(
        '@relation(fields: [dashboardId], references: [id], onDelete: Cascade)'
      )
      expect(block).toContain('@@index([dashboardId])')
    })
  })

  describe('InsightsFilterTarget', () => {
    const block = modelBlock('InsightsFilterTarget')

    it('mapea a la tabla insights_filter_targets', () => {
      expect(block).toContain('@@map("insights_filter_targets")')
    })

    it('usa clave primaria compuesta filterId + widgetId', () => {
      expect(block).toContain('@@id([filterId, widgetId])')
      expect(block).toContain('@map("filter_id")')
      expect(block).toContain('@map("widget_id")')
    })

    it('cascadea desde ambos lados para no dejar targets colgados', () => {
      expect(block).toContain(
        '@relation(fields: [filterId], references: [id], onDelete: Cascade)'
      )
      expect(block).toContain(
        '@relation(fields: [widgetId], references: [id], onDelete: Cascade)'
      )
    })
  })

  it('expone los 4 tipos generados por Prisma Client', () => {
    const dashboard: Pick<InsightsDashboard, 'slug' | 'esSistema' | 'creadoPor'> = {
      slug: 'panorama-general',
      esSistema: true,
      creadoPor: 'user_test123',
    }
    const widget: Pick<InsightsWidget, 'tipo' | 'x' | 'y' | 'w' | 'h'> = {
      tipo: 'kpi',
      x: 0,
      y: 0,
      w: 6,
      h: 6,
    }
    const filtro: Pick<InsightsFilter, 'dataset' | 'dimension' | 'operator'> = {
      dataset: 'deportistas',
      dimension: 'disciplina',
      operator: 'in',
    }
    const target: InsightsFilterTarget = { filterId: 'f1', widgetId: 'w1' }

    expect(dashboard.slug).toBe('panorama-general')
    expect(widget.tipo).toBe('kpi')
    expect(filtro.dataset).toBe('deportistas')
    expect(target.filterId).toBe('f1')
  })
})
