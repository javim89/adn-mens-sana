'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';
import { deleteSeguimiento } from '@/lib/actions/seguimientos';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';

interface Props {
  seguimientoId: string;
  seguimientoTitulo: string;
  onDeleted?: () => void;
  redirectAfterDelete?: string;
}

export default function DeleteSeguimientoModal({
  seguimientoId,
  seguimientoTitulo,
  onDeleted,
  redirectAfterDelete,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await deleteSeguimiento(seguimientoId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOpen(false);
      if (onDeleted) {
        onDeleted();
      } else if (redirectAfterDelete) {
        router.push(redirectAfterDelete);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Eliminar seguimiento</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogDescription>
            ¿Estás seguro que querés eliminar el seguimiento{' '}
            <span className="font-semibold text-foreground">&quot;{seguimientoTitulo}&quot;</span>?
            Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              'Confirmar eliminación'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
