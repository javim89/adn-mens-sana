'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Camera, Crop, Loader2, RotateCcw, Trash2, X } from 'lucide-react';
import { Avatar } from '@/app/components/ui/avatar';
import { Button } from '@/app/components/ui/button';
import {
  FOTO_MAX_BYTES,
  FOTO_ORIGINAL_MAX_BYTES,
  FOTO_TIPOS,
  isFotoContentType,
} from '@/lib/foto-constants';
import FotoCropDialog from './FotoCropDialog';

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

// Recorte → original, para que "Ajustar" reencuadre sobre la foto completa.
// Vive fuera del componente porque las pestañas del form lo desmontan.
const originales = new WeakMap<File, File>();

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
  const ajustarRef = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editor, setEditor] = useState<{
    src: string;
    original: File;
    volverA: React.RefObject<HTMLButtonElement | null>;
  } | null>(null);
  const [cargandoOriginal, setCargandoOriginal] = useState(false);

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

  useEffect(() => {
    if (!editor) return;
    return () => URL.revokeObjectURL(editor.src);
  }, [editor]);

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
    if (file.size > FOTO_ORIGINAL_MAX_BYTES) {
      setError('La imagen supera los 20 MB.');
      return;
    }
    setError(null);
    abrirEditor(file, elegirRef);
  }

  function abrirEditor(original: File, volverA: React.RefObject<HTMLButtonElement | null>) {
    setEditor({ src: URL.createObjectURL(original), original, volverA });
  }

  function cerrarEditor() {
    setEditor(null);
  }

  // El Dialog no tiene DialogTrigger: sin esto el foco cae en <body> al cerrar.
  function devolverFoco(event: Event) {
    event.preventDefault();
    editor?.volverA.current?.focus();
  }

  function handleApply(recorte: File) {
    if (!editor) return;
    if (recorte.size > FOTO_MAX_BYTES) {
      setError('La imagen recortada supera los 5 MB.');
      cerrarEditor();
      return;
    }
    originales.set(recorte, editor.original);
    setError(null);
    onChange(recorte);
    cerrarEditor();
  }

  // La foto guardada se baja como blob (sin caché: el <img> del avatar la pudo cachear sin headers CORS)
  // para que el canvas no quede "tainted" al recortar.
  async function handleAjustar() {
    if (value instanceof File) {
      abrirEditor(originales.get(value) ?? value, ajustarRef);
      return;
    }
    if (!currentUrl) return;
    setCargandoOriginal(true);
    setError(null);
    try {
      const res = await fetch(currentUrl, { mode: 'cors', cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      abrirEditor(new File([blob], 'foto', { type: blob.type || 'image/jpeg' }), ajustarRef);
    } catch {
      setError('No se pudo cargar la foto actual para ajustarla.');
    } finally {
      setCargandoOriginal(false);
    }
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
            className="border-primario text-primario hover:bg-secundario/5 hover:text-primario"
          >
            <Camera />
            {hasFoto ? 'Cambiar' : 'Subir foto'}
          </Button>
          {hasFoto && (
            <Button
              ref={ajustarRef}
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || cargandoOriginal}
              onClick={handleAjustar}
              className="border-gray-200 text-primario hover:bg-secundario/5 hover:text-primario"
            >
              {cargandoOriginal ? <Loader2 className="animate-spin" /> : <Crop />}
              Ajustar
            </Button>
          )}
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
              className="text-secundario hover:bg-secundario/5 hover:text-primario"
            >
              <RotateCcw />
              Restaurar foto
            </Button>
          )}
        </div>

        <p className="mt-2 text-xs text-muted-foreground">JPG, PNG o WebP. Máx. 20 MB.</p>
        {error && (
          <p id={errorId} role="alert" className="mt-1 text-xs text-red-600">
            {error}
          </p>
        )}
      </div>

      {editor && (
        <FotoCropDialog
          key={editor.src}
          open
          src={editor.src}
          onCancel={cerrarEditor}
          onApply={handleApply}
          onCloseAutoFocus={devolverFoco}
        />
      )}
    </div>
  );
}
