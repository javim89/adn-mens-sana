'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Camera, RotateCcw, Trash2, X } from 'lucide-react';
import { Avatar } from '@/app/components/ui/avatar';
import { Button } from '@/app/components/ui/button';
import { FOTO_MAX_BYTES, FOTO_TIPOS, isFotoContentType } from '@/lib/foto-constants';

/**
 * `value`: File = foto nueva pendiente, null = quitar la actual, undefined = sin cambios.
 * Es controlado porque las pestañas del form se desmontan al cambiar de tab.
 */
interface FotoPerfilInputProps {
  value: File | null | undefined;
  currentUrl: string | null;
  iniciales: string;
  disabled?: boolean;
  onChange: (value: File | null | undefined) => void;
}

const ACCEPT = Object.keys(FOTO_TIPOS).join(',');

export default function FotoPerfilInput({
  value,
  currentUrl,
  iniciales,
  disabled = false,
  onChange,
}: FotoPerfilInputProps) {
  const inputId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const elegirRef = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- el object URL es un recurso externo que hay que crear y revocar acá
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const src = value instanceof File ? previewUrl : value === null ? null : currentUrl;
  const hasPendingFile = value instanceof File;
  const hasFoto = hasPendingFile || (value === undefined && Boolean(currentUrl));
  const removalPending = value === null && Boolean(currentUrl);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!isFotoContentType(file.type)) {
      setError('Formato no permitido. Usá JPG, PNG o WebP.');
      return;
    }
    if (file.size > FOTO_MAX_BYTES) {
      setError('La imagen supera los 5 MB.');
      return;
    }
    setError(null);
    onChange(file);
  }

  // Descartar un archivo pendiente vuelve al estado original; solo se borra la foto guardada si no hay nada pendiente.
  // Quitar/Descartar/Restaurar se desmontan al hacer click: el foco pasa al botón principal en vez de perderse.
  function handleQuitar() {
    setError(null);
    onChange(hasPendingFile ? undefined : null);
    elegirRef.current?.focus();
  }

  function handleRestaurar() {
    setError(null);
    onChange(undefined);
    elegirRef.current?.focus();
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Avatar
        src={src}
        alt="Foto de perfil"
        iniciales={iniciales}
        className="size-24 text-3xl"
      />

      <div className="min-w-0 flex-1">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPT}
          onChange={handleFileChange}
          disabled={disabled}
          aria-describedby={error ? errorId : undefined}
          // El botón "Subir foto" es el control; sin esto el input invisible es un tab stop sin foco visible.
          tabIndex={-1}
          className="sr-only"
        />
        <label htmlFor={inputId} className="sr-only">
          Seleccionar foto de perfil
        </label>

        <div className="flex flex-wrap gap-2">
          <Button
            ref={elegirRef}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="border-[#121A61] text-[#121A61] hover:bg-[#3346CC]/5 hover:text-[#121A61]"
          >
            <Camera />
            {hasFoto ? 'Cambiar' : 'Subir foto'}
          </Button>
          {hasFoto && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={handleQuitar}
              className="border-gray-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              {hasPendingFile ? <X /> : <Trash2 />}
              {hasPendingFile ? 'Descartar' : 'Quitar'}
            </Button>
          )}
          {removalPending && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={handleRestaurar}
              className="text-[#3346CC] hover:bg-[#3346CC]/5 hover:text-[#121A61]"
            >
              <RotateCcw />
              Restaurar foto
            </Button>
          )}
        </div>

        <p className="mt-2 text-xs text-[#6B7280]">JPG, PNG o WebP. Máx. 5 MB.</p>
        {error && (
          <p id={errorId} role="alert" className="mt-1 text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
