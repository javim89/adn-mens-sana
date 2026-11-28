import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * `Rotulo`: rótulo chico en mayúsculas, gris (encabezados de panel, de columnas, de grupos).
 *
 * ```tsx
 * <Rotulo>Próximos turnos</Rotulo>
 * <Rotulo como="h2">Abiertos por tipo</Rotulo>
 * ```
 */
export interface RotuloProps {
  children: ReactNode;
  como?: 'p' | 'span' | 'h2' | 'h3' | 'div';
  className?: string;
  id?: string;
}

export const ROTULO_CLASES = 'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';

export function Rotulo({ children, como: Etiqueta = 'p', className, id }: RotuloProps) {
  return (
    <Etiqueta id={id} className={cn(ROTULO_CLASES, className)}>
      {children}
    </Etiqueta>
  );
}

/**
 * `Panel`: card blanca de la app (borde, `rounded-xl`, sombra suave). Con `titulo` arma un
 * encabezado con el `Rotulo` a la izquierda y `accion` (link "Ver todos", botón…) a la
 * derecha, y el panel pasa a ser un `<section>`.
 *
 * ```tsx
 * <Panel titulo="Abiertos por tipo" accion={<Link href="/seguimientos">Ver todos</Link>}>
 *   <ul>…</ul>
 * </Panel>
 *
 * // Tablas/listas a sangre: sin padding y con overflow-hidden.
 * <Panel relleno={false} className="overflow-hidden">…</Panel>
 * ```
 *
 * - `tituloComo`: nivel del título (default `h2`; usar `h3` si el panel va dentro de otra sección).
 * - `relleno`: padding interno (`p-4`). Default `true`.
 */
export interface PanelProps {
  children?: ReactNode;
  titulo?: ReactNode;
  tituloComo?: 'h2' | 'h3' | 'p';
  accion?: ReactNode;
  relleno?: boolean;
  className?: string;
  id?: string;
}

export function Panel({
  children,
  titulo,
  tituloComo = 'h2',
  accion,
  relleno = true,
  className,
  id,
}: PanelProps) {
  const Contenedor = titulo ? 'section' : 'div';
  const encabezado = (titulo || accion) && (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2',
        relleno ? 'mb-3' : 'border-b border-border px-4 py-3',
      )}
    >
      {titulo ? <Rotulo como={tituloComo}>{titulo}</Rotulo> : <span />}
      {accion && <div className="shrink-0 text-xs font-semibold">{accion}</div>}
    </div>
  );

  return (
    <Contenedor
      id={id}
      className={cn(
        'min-w-0 rounded-xl border border-border bg-background shadow-sm',
        relleno && 'p-4',
        className,
      )}
    >
      {encabezado}
      {children}
    </Contenedor>
  );
}

export default Panel;
