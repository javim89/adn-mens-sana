'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Trash2 } from 'lucide-react';
import { deleteDeportista } from '@/lib/api/deportistas';

interface DeleteDeportistaModalProps {
  deportistaId: string;
  deportistaNombre: string;
}

export default function DeleteDeportistaModal({
  deportistaId,
  deportistaNombre,
}: DeleteDeportistaModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const { mutate, isPending, error } = useMutation({
    mutationFn: () => deleteDeportista(deportistaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deportistas'] });
      router.push('/deportistas');
    },
  });

  function handleConfirm() {
    mutate();
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 text-sm font-medium border border-red-300 text-red-600 rounded-lg px-4 py-2 hover:bg-red-50 transition-colors"
      >
        <Trash2 size={15} />
        Eliminar
      </button>

      {/* Modal overlay — always in DOM, visibility controlled */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        data-testid="delete-modal"
        style={{ display: isOpen ? 'flex' : 'none' }}
        className="fixed inset-0 z-50 items-center justify-center bg-black/40 backdrop-blur-sm"
      >
        <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
          <h2
            id="delete-modal-title"
            className="text-lg font-bold text-[#1C1C1C] mb-2"
            style={{ fontFamily: 'Oswald, sans-serif' }}
          >
            Confirmar eliminación
          </h2>
          <p className="text-sm text-[#6B7280] mb-6">
            ¿Estás seguro que querés eliminar a{' '}
            <span className="font-semibold text-[#1C1C1C]">{deportistaNombre}</span>? Esta acción
            no se puede deshacer.
          </p>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error instanceof Error ? error.message : 'Error al eliminar'}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
              className="text-sm text-[#6B7280] hover:text-[#1C1C1C] border border-gray-200 rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
              className="flex items-center gap-2 bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Confirmar eliminación'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
