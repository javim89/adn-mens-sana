'use client';

import { useCallback, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChartColumn, Filter, Plus, Redo2, Save, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Layout } from 'react-grid-layout';
import {
  deleteFilter,
  saveDashboardLayout,
  saveFilter,
  type DashboardDetail,
  type DashboardFilter,
  type DashboardWidget,
} from '@/lib/actions/insights';
import DashboardGrid from './DashboardGrid';
import WidgetEditorDialog, { type WidgetDraft } from './WidgetEditorDialog';
import DashboardFilterDialog, { type FilterDraft } from './DashboardFilterDialog';
import DashboardFilterBar from './DashboardFilterBar';
import { useDraftHistory } from './useDraftHistory';

/** Id temporal de un widget aún no persistido. */
function tempId() {
  return `nuevo-${Math.random().toString(36).slice(2, 10)}`;
}

function isTemp(id: string) {
  return id.startsWith('nuevo-');
}

/** Ubica un widget nuevo debajo de todo, en la primera columna. */
function nextPosition(widgets: DashboardWidget[]) {
  const bottom = widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0);
  return { x: 0, y: bottom, w: 6, h: 8 };
}

export default function DashboardEditor({ dashboard }: { dashboard: DashboardDetail }) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();

  const {
    present: widgets,
    commit,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
  } = useDraftHistory<DashboardWidget[]>(dashboard.widgets);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<DashboardWidget | undefined>();
  const [dirty, setDirty] = useState(false);

  // Los filtros se persisten por su cuenta (no forman parte del draft del
  // layout): su server action escribe de una y el router refresca.
  const [filtroOpen, setFiltroOpen] = useState(false);
  const [filtroEditando, setFiltroEditando] = useState<DashboardFilter | undefined>();

  const markDirty = () => setDirty(true);

  const handleLayoutChange = useCallback(
    (layout: Layout) => {
      // La grilla emite el layout también en el primer render. Si eso entrara a
      // la pila de undo, el editor arrancaría "sucio" y con un paso fantasma.
      const changed = layout.some((item) => {
        const w = widgets.find((x) => x.id === item.i);
        return w && (w.x !== item.x || w.y !== item.y || w.w !== item.w || w.h !== item.h);
      });
      if (!changed) return;

      const next = widgets.map((w) => {
        const item = layout.find((l) => l.i === w.id);
        return item ? { ...w, x: item.x, y: item.y, w: item.w, h: item.h } : w;
      });
      commit(next);
      markDirty();
    },
    [widgets, commit],
  );

  const handleSaveWidget = (draft: WidgetDraft) => {
    const base = {
      titulo: draft.titulo.trim(),
      descripcion: draft.descripcion?.trim() || null,
      tipo: draft.tipo,
      querySpec: draft.querySpec,
      vizConfig: draft.vizConfig as unknown as Record<string, unknown>,
    };

    if (editing) {
      commit(widgets.map((w) => (w.id === editing.id ? { ...w, ...base } : w)));
    } else {
      commit([...widgets, { id: tempId(), ...base, ...nextPosition(widgets) }]);
    }
    markDirty();
    setEditing(undefined);
  };

  const handleDuplicate = (widget: DashboardWidget) => {
    commit([
      ...widgets,
      {
        ...widget,
        id: tempId(),
        titulo: `${widget.titulo} (copia)`,
        ...nextPosition(widgets),
      },
    ]);
    markDirty();
  };

  const handleDelete = (widget: DashboardWidget) => {
    commit(widgets.filter((w) => w.id !== widget.id));
    markDirty();
  };

  const handleSaveFilter = (draft: FilterDraft) => {
    startSaving(async () => {
      // Un filtro solo puede apuntar a widgets ya persistidos: los temporales
      // todavía no tienen id en la base.
      const targets = draft.widgetIds.filter((id) => !isTemp(id));
      if (targets.length === 0) {
        toast.error('Guardá primero los widgets nuevos para poder filtrarlos');
        return;
      }

      const result = await saveFilter(dashboard.id, { ...draft, widgetIds: targets });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Filtro guardado');
      setFiltroEditando(undefined);
      router.refresh();
    });
  };

  const handleDeleteFilter = (filtro: DashboardFilter) => {
    startSaving(async () => {
      const result = await deleteFilter(filtro.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Filtro eliminado');
      router.refresh();
    });
  };

  const save = () => {
    startSaving(async () => {
      const result = await saveDashboardLayout(
        dashboard.id,
        widgets.map((w) => ({
          // Los ids temporales no se mandan: el servidor crea esos widgets.
          ...(isTemp(w.id) ? {} : { id: w.id }),
          titulo: w.titulo,
          descripcion: w.descripcion ?? undefined,
          tipo: w.tipo,
          querySpec: w.querySpec,
          // `vizConfig` vuelve de la base como JSON sin tipar. El `type` siempre
          // está (lo exige el schema al escribir), pero hay que reafirmarlo:
          // se reconstruye desde `w.tipo`, que es la fuente autoritativa y la
          // que el servidor compara contra `vizConfig.type`.
          vizConfig: { ...w.vizConfig, type: w.tipo },
          x: w.x,
          y: w.y,
          w: w.w,
          h: w.h,
        })),
      );

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success('Dashboard guardado');
      setDirty(false);
      reset(result.widgets ?? widgets);
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 bg-white rounded-xl border border-gray-100 px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            aria-label="Deshacer"
            title="Deshacer"
            className="h-8 w-8 flex items-center justify-center rounded-md text-[#6B7280] hover:bg-[#F3F4F6] disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Undo2 size={16} />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            aria-label="Rehacer"
            title="Rehacer"
            className="h-8 w-8 flex items-center justify-center rounded-md text-[#6B7280] hover:bg-[#F3F4F6] disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Redo2 size={16} />
          </button>
          {dirty && (
            <span className="ml-2 text-xs text-[#C9A84C]">Cambios sin guardar</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditing(undefined);
              setEditorOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm text-[#1C1C1C] hover:border-[#3346CC]"
          >
            <Plus size={15} /> Agregar widget
          </button>
          <button
            type="button"
            onClick={() => {
              setFiltroEditando(undefined);
              setFiltroOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm text-[#1C1C1C] hover:border-[#3346CC]"
          >
            <Filter size={15} /> Agregar filtro
          </button>
          <button
            type="button"
            onClick={save}
            disabled={isSaving || !dirty}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#121A61] text-white text-sm hover:bg-[#1E2A8A] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save size={15} /> {isSaving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>

      <DashboardFilterBar
        filtros={dashboard.filtros}
        valores={{}}
        onChange={() => {}}
        editable
        onEdit={(f) => {
          setFiltroEditando(f);
          setFiltroOpen(true);
        }}
        onDelete={handleDeleteFilter}
      />

      {widgets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
          <ChartColumn size={28} className="mx-auto text-[#6B7280] mb-3" />
          <p className="text-[#1C1C1C] font-medium mb-1">Dashboard vacío</p>
          <p className="text-sm text-[#6B7280]">
            Agregá el primer widget para empezar.
          </p>
        </div>
      ) : (
        <DashboardGrid
          widgets={widgets}
          editable
          onLayoutChange={handleLayoutChange}
          onEditWidget={(w) => {
            setEditing(w);
            setEditorOpen(true);
          }}
          onDuplicateWidget={handleDuplicate}
          onDeleteWidget={handleDelete}
        />
      )}

      <WidgetEditorDialog
        // Remonta el editor por cada widget distinto (y en cada apertura para
        // "nuevo"), que es cómo se resetea su borrador sin usar un effect.
        key={editing?.id ?? `nuevo-${editorOpen}`}
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) setEditing(undefined);
        }}
        dashboardNombre={dashboard.nombre}
        widget={
          editing
            ? {
                id: editing.id,
                titulo: editing.titulo,
                descripcion: editing.descripcion ?? undefined,
                tipo: editing.tipo,
                querySpec: editing.querySpec,
                vizConfig: editing.vizConfig as never,
              }
            : undefined
        }
        onSave={handleSaveWidget}
      />

      <DashboardFilterDialog
        key={filtroEditando?.id ?? `nuevo-filtro-${filtroOpen}`}
        open={filtroOpen}
        onOpenChange={(open) => {
          setFiltroOpen(open);
          if (!open) setFiltroEditando(undefined);
        }}
        widgets={widgets}
        filter={filtroEditando}
        onSave={handleSaveFilter}
      />
    </>
  );
}
