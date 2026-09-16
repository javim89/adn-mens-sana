'use client';

import { useMemo } from 'react';
import { ResponsiveGridLayout, useContainerWidth, type Layout } from 'react-grid-layout';
import type { DashboardWidget } from '@/lib/actions/insights';
import type { ActiveDashboardFilter } from '@/lib/insights/apply-filters';
import WidgetCard from './WidgetCard';
import { useIsTouchWidth } from './useIsTouchWidth';

/**
 * Grilla del dashboard.
 *
 * react-grid-layout v2 cambió la API respecto de v1: ya no existe el HOC
 * `WidthProvider` (ahora `ResponsiveGridLayout` mide su contenedor solo) y las
 * props sueltas de drag/resize se agruparon en `dragConfig` / `resizeConfig`.
 */
export const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
export const COLS = { lg: 12, md: 8, sm: 4, xs: 1, xxs: 1 };
export const ROW_HEIGHT = 40;

interface Props {
  widgets: DashboardWidget[];
  editable?: boolean;
  /** Filtros de dashboard activos, ya resueltos a valores concretos. */
  filtros?: ActiveDashboardFilter[];
  onLayoutChange?: (layout: Layout) => void;
  onEditWidget?: (widget: DashboardWidget) => void;
  onDuplicateWidget?: (widget: DashboardWidget) => void;
  onDeleteWidget?: (widget: DashboardWidget) => void;
}

export default function DashboardGrid({
  widgets,
  editable = false,
  filtros,
  onLayoutChange,
  onEditWidget,
  onDuplicateWidget,
  onDeleteWidget,
}: Props) {
  // En mobile el arrastre compite con el scroll táctil, así que se apaga aunque
  // se esté en modo edición.
  const isTouchWidth = useIsTouchWidth(BREAKPOINTS.md);
  const interactive = editable && !isTouchWidth;

  // v2 no trae el HOC `WidthProvider`: la medición del contenedor la hace este
  // hook y el ancho se pasa como prop.
  const { width, containerRef } = useContainerWidth();

  // Solo se persiste el layout de `lg`; los demás los deriva la librería.
  const layouts = useMemo(
    () => ({
      lg: widgets.map((w) => ({
        i: w.id,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
        minW: 2,
        minH: 3,
      })),
    }),
    [widgets],
  );

  return (
    <div ref={containerRef} className="w-full min-w-0">
      <ResponsiveGridLayout
      width={width}
      className={`insights-grid ${interactive ? '' : 'is-static'}`}
      layouts={layouts}
      breakpoints={BREAKPOINTS}
      cols={COLS}
      rowHeight={ROW_HEIGHT}
      margin={[20, 20]}
      containerPadding={[0, 0]}
      dragConfig={{
        enabled: interactive,
        bounded: false,
        // El asa es el header del widget: si fuera la card entera no se podría
        // hacer scroll dentro de una tabla ni tocar un punto del gráfico.
        handle: '.widget-drag-handle',
        cancel: "button, a, input, select, textarea, [role='menu'], [role='menuitem']",
        threshold: 4,
      }}
      resizeConfig={{ enabled: interactive, handles: ['se'] }}
      onLayoutChange={(_layout, all) => {
        // Solo interesa el de escritorio: es el único que se guarda.
        const lg = (all as { lg?: Layout })?.lg;
        if (lg) onLayoutChange?.(lg);
      }}
    >
      {widgets.map((widget) => (
        <div key={widget.id} className="group/widget">
          <WidgetCard
            widget={widget}
            editable={editable}
            filtros={filtros}
            onEdit={onEditWidget}
            onDuplicate={onDuplicateWidget}
            onDelete={onDeleteWidget}
          />
        </div>
      ))}
      </ResponsiveGridLayout>
    </div>
  );
}
