'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MoreHorizontal, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { deleteDashboard } from '@/lib/actions/insights';

/**
 * Menú de acciones de una card del listado de Insights.
 *
 * Vive en la card y no en la vista del dashboard porque eliminar deja al usuario
 * sin la página en la que estaría: desde el listado no hay a dónde redirigir.
 *
 * Solo se renderiza para dashboards que NO son del sistema — los seedeados por
 * `npm run seed:insights` se recrean en cada corrida y `deleteDashboard` los
 * rechaza, así que ofrecer el botón sería prometer algo que la action no cumple.
 */
export default function DashboardCardActions({
  id,
  nombre,
}: {
  id: string;
  nombre: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const confirmar = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteDashboard(id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      toast.success('Dashboard eliminado');
      setOpen(false);
      // La action ya revalidó /insights; esto refresca el árbol de esta pestaña.
      router.refresh();
    });
  };

  return (
    <>
      {/* `modal={false}`: el item abre un diálogo, que también es modal. Con los
          dos modales vivos a la vez los FocusScope de Radix se pelean el foco y
          entran en recursión infinita. El menú no necesita serlo. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Acciones de ${nombre}`}
            className="shrink-0 h-7 w-7 flex items-center justify-center rounded-md text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#1C1C1C] transition-colors"
          >
            <MoreHorizontal size={16} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            onClick={() => setOpen(true)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 size={14} /> Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (isPending) return;
          setOpen(next);
          if (!next) setError(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Oswald, sans-serif' }}>
              Eliminar dashboard
            </DialogTitle>
            <DialogDescription>
              Se va a eliminar{' '}
              <span className="font-semibold text-[#1C1C1C]">
                &quot;{nombre}&quot;
              </span>{' '}
              con todos sus widgets y filtros. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="px-4 py-3 rounded-lg border border-red-100 bg-red-50 text-sm text-red-700">
              {error}
            </div>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="px-4 py-2 text-sm text-[#6B7280] hover:text-[#1C1C1C] disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmar}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Eliminando…
                </>
              ) : (
                'Eliminar'
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
