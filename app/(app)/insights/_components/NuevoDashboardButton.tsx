'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { createDashboard } from '@/lib/actions/insights';

export default function NuevoDashboardButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      const result = await createDashboard({
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success('Dashboard creado');
      setOpen(false);
      setNombre('');
      setDescripcion('');
      // Se entra directo al editor: un dashboard vacío no sirve de nada.
      router.push(`/insights/${result.id}/editar`);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#121A61] text-white text-sm hover:bg-[#1E2A8A] transition-colors"
      >
        <Plus size={16} /> Nuevo dashboard
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Oswald, sans-serif' }}>
              Nuevo dashboard
            </DialogTitle>
            <DialogDescription>
              Después vas a poder agregarle widgets y filtros.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label
                htmlFor="dashboard-nombre"
                className="block text-sm font-medium text-[#1C1C1C] mb-1.5"
              >
                Nombre
              </label>
              <input
                id="dashboard-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && nombre.trim() && !isPending) submit();
                }}
                placeholder="Seguimiento de lesiones"
                autoFocus
                className="h-9 w-full rounded-md border border-gray-200 px-2 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="dashboard-desc"
                className="block text-sm font-medium text-[#1C1C1C] mb-1.5"
              >
                Descripción <span className="text-[#6B7280] font-normal">(opcional)</span>
              </label>
              <textarea
                id="dashboard-desc"
                rows={2}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full rounded-md border border-gray-200 p-2 text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2 text-sm text-[#6B7280] hover:text-[#1C1C1C]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!nombre.trim() || isPending}
              className="px-4 py-2 rounded-lg bg-[#121A61] text-white text-sm hover:bg-[#1E2A8A] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPending ? 'Creando…' : 'Crear'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
