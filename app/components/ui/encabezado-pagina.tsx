import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Encabezado de una página de la app logueada: `<h1>` en Oswald con el color primario del
 * club, píldora opcional con el contador, bajada opcional y la acción principal a la
 * derecha (en mobile baja a la línea siguiente). Reemplaza los `<h1>` armados a mano.
 *
 * ```tsx
 * <EncabezadoPagina
 *   titulo="Seguimientos"
 *   contador={total}
 *   contadorLabel={`${total} seguimientos abiertos`}
 *   subtitulo="Lo que está abierto en el plantel."
 *   accion={<Button asChild><Link href="/seguimientos/nuevo">Nuevo seguimiento</Link></Button>}
 * >
 *   {filtros}
 * </EncabezadoPagina>
 * ```
 *
 * - `contadorLabel`: texto para lectores de pantalla (el número visible queda oculto para
 *   ellos). Sin él, se lee el número tal cual.
 * - `children`: va debajo del título (fila de filtros, banner…).
 * - La página sigue poniendo su padding (`p-4 md:p-8`); este componente no agrega.
 */
export interface EncabezadoPaginaProps {
  titulo: string;
  contador?: number | string;
  contadorLabel?: string;
  subtitulo?: ReactNode;
  accion?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function EncabezadoPagina({
  titulo,
  contador,
  contadorLabel,
  subtitulo,
  accion,
  children,
  className,
}: EncabezadoPaginaProps) {
  const hayContador = contador !== undefined && contador !== null && contador !== '';

  return (
    <header className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="min-w-0 font-[family-name:var(--font-oswald)] text-2xl font-bold leading-tight text-primario md:text-3xl">
              {titulo}
            </h1>
            {hayContador && (
              <span
                data-slot="contador"
                className="inline-flex shrink-0 items-center rounded-full bg-primario-suave px-2.5 py-0.5 font-mono text-xs font-semibold text-primario"
              >
                {contadorLabel ? (
                  <>
                    <span aria-hidden>{contador}</span>
                    <span className="sr-only">{contadorLabel}</span>
                  </>
                ) : (
                  contador
                )}
              </span>
            )}
          </div>
          {subtitulo && <p className="mt-1 text-sm text-muted-foreground">{subtitulo}</p>}
        </div>
        {accion && <div className="flex shrink-0 flex-wrap items-center gap-2">{accion}</div>}
      </div>
      {children}
    </header>
  );
}

export default EncabezadoPagina;
