'use client';

import { useId, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Loader2, RotateCcw, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { getCroppedImage } from '@/lib/crop-image';

interface FotoCropDialogProps {
  open: boolean;
  /** URL (blob: o S3) de la imagen original a encuadrar. */
  src: string;
  onCancel: () => void;
  onApply: (file: File) => void;
  /** Sin DialogTrigger, Radix no sabe a dónde devolver el foco al cerrar: lo decide quien abre el editor. */
  onCloseAutoFocus?: (event: Event) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
// Mantiene la rotación en [-180, 180) para que el slider fino siempre la represente.
const normalizeRotation = (r: number) => ((((r + 180) % 360) + 360) % 360) - 180;

export default function FotoCropDialog({
  open,
  src,
  onCancel,
  onApply,
  onCloseAutoFocus,
}: FotoCropDialogProps) {
  const zoomId = useId();
  const rotationId = useId();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [rotation, setRotation] = useState(0);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleReset() {
    setCrop({ x: 0, y: 0 });
    setZoom(MIN_ZOOM);
    setRotation(0);
  }

  async function handleApply() {
    if (!areaPixels) return;
    setApplying(true);
    setError(null);
    try {
      onApply(await getCroppedImage(src, areaPixels, rotation));
    } catch {
      setError('No se pudo procesar la imagen. Probá con otra foto.');
    } finally {
      setApplying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !applying && onCancel()}>
      <DialogContent
        onCloseAutoFocus={onCloseAutoFocus}
        className="max-h-[95vh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-lg p-4 sm:p-6"
      >
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'Oswald, sans-serif' }} className="text-[#121A61]">
            Ajustar foto
          </DialogTitle>
          <DialogDescription>
            Arrastrá para encuadrar. Usá el zoom y la rotación para centrar la cara.
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-[#121A61]">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            aspect={1}
            cropShape="round"
            showGrid={false}
            objectFit="contain"
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={(r) => setRotation(normalizeRotation(r))}
            onCropComplete={(_, pixels) => setAreaPixels(pixels)}
            mediaProps={{ crossOrigin: 'anonymous' }}
            cropperProps={{ 'aria-label': 'Área de recorte. Usá las flechas para mover la foto.' }}
          />
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor={zoomId} className="mb-1 block text-xs font-medium text-[#1C1C1C]">
              Zoom
            </label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Alejar"
                disabled={applying || zoom <= MIN_ZOOM}
                onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
                className="shrink-0 border-gray-200 text-[#121A61]"
              >
                <ZoomOut />
              </Button>
              <input
                id={zoomId}
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.05}
                value={zoom}
                disabled={applying}
                aria-valuetext={`${zoom.toFixed(1)}×`}
                onChange={(e) => setZoom(clampZoom(Number(e.target.value)))}
                className="h-2 min-w-0 flex-1 cursor-pointer accent-[#121A61]"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Acercar"
                disabled={applying || zoom >= MAX_ZOOM}
                onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
                className="shrink-0 border-gray-200 text-[#121A61]"
              >
                <ZoomIn />
              </Button>
            </div>
          </div>

          <div>
            <label htmlFor={rotationId} className="mb-1 block text-xs font-medium text-[#1C1C1C]">
              Rotación
            </label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Rotar 90° a la izquierda"
                disabled={applying}
                onClick={() => setRotation((r) => normalizeRotation(r - 90))}
                className="shrink-0 border-gray-200 text-[#121A61]"
              >
                <RotateCcw />
              </Button>
              <input
                id={rotationId}
                type="range"
                min={-180}
                max={180}
                step={1}
                value={rotation}
                disabled={applying}
                aria-valuetext={`${rotation}°`}
                // El rango ya acota a [-180, 180]; normalizar acá haría saltar el control de 180 a -180.
                onChange={(e) => setRotation(Number(e.target.value))}
                className="h-2 min-w-0 flex-1 cursor-pointer accent-[#121A61]"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Rotar 90° a la derecha"
                disabled={applying}
                onClick={() => setRotation((r) => normalizeRotation(r + 90))}
                className="shrink-0 border-gray-200 text-[#121A61]"
              >
                <RotateCw />
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}

        <DialogFooter className="gap-2 sm:items-center sm:justify-between sm:space-x-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={applying}
            onClick={handleReset}
            className="text-[#3346CC] hover:bg-[#3346CC]/5 hover:text-[#121A61]"
          >
            Restablecer
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={applying}
              onClick={onCancel}
              className="border-gray-200 text-[#6B7280] hover:text-[#1C1C1C]"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={applying || !areaPixels}
              onClick={handleApply}
              className="bg-[#121A61] text-white hover:bg-[#1E2A8A]"
            >
              {applying && <Loader2 className="animate-spin" />}
              {applying ? 'Aplicando…' : 'Aplicar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
