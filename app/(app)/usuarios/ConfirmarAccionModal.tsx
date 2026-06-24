'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmarAccionModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export default function ConfirmarAccionModal({
  open,
  title,
  description,
  confirmLabel,
  isPending,
  onConfirm,
  onCancel,
  danger = false,
}: ConfirmarAccionModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmar-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="bg-white rounded-xl shadow-lg w-full max-w-sm">
        <div className="px-6 py-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            {danger && (
              <AlertTriangle size={18} className="text-red-600 shrink-0" />
            )}
            <h2
              id="confirmar-titulo"
              className="text-base font-semibold text-[#121A61] font-['Oswald',sans-serif]"
            >
              {title}
            </h2>
          </div>
          <p className="text-sm text-[#6B7280]">{description}</p>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="text-sm text-[#6B7280] hover:text-[#1C1C1C] border border-gray-200 rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`flex items-center gap-2 text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
              danger
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-[#121A61] hover:bg-[#1E2A8A] text-white'
            }`}
          >
            {isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {confirmLabel}...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
