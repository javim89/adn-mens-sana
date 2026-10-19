'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  alt: string;
  iniciales: string;
  /** Clases de tamaño y tipografía, ej. `size-16 sm:size-20 text-xl`. */
  className?: string;
}

export function Avatar({ src, alt, iniciales, className = 'size-10 text-sm' }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = Boolean(src) && src !== failedSrc;

  return (
    <div className={cn('relative shrink-0 overflow-hidden rounded-full', className)}>
      {showImage ? (
        // Las URLs prefirmadas de S3 cambian en cada request: next/image no aporta caché y obligaría a configurar remotePatterns.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt={alt}
          onError={() => setFailedSrc(src!)}
          className="size-full object-cover"
        />
      ) : (
        <span
          role="img"
          aria-label={alt}
          className="flex size-full items-center justify-center bg-[#121A61] font-semibold uppercase text-white font-[family-name:var(--font-oswald)]"
        >
          {iniciales}
        </span>
      )}
    </div>
  );
}
