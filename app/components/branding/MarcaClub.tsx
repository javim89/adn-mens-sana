import { inicialesDelClub } from '@/lib/branding/marca';

const TAMANIO = {
  sm: { chip: 'h-8 w-8 rounded-md p-0.5', iniciales: 'text-xs', nombre: 'text-sm truncate' },
  md: { chip: 'h-10 w-10 rounded-lg p-1', iniciales: 'text-sm', nombre: 'text-sm line-clamp-2' },
  lg: { chip: 'h-16 w-16 rounded-xl p-1.5', iniciales: 'text-xl', nombre: 'text-2xl line-clamp-2' },
} as const;

/**
 * La marca del club en la app: su logo en un chip blanco redondeado más el nombre en
 * Oswald uppercase. El chip blanco hace que cualquier escudo se lea sobre cualquier
 * fondo (también uno con fondo blanco, como el de Gimnasia, sobre el primario).
 *
 * Sin logo, el chip muestra las iniciales del club. El logo es decorativo (`alt=""`):
 * el nombre de al lado ya es el texto accesible. Es un `<img>` y no `next/image`
 * porque la URL lleva `?v=` (versión del tema) y la sirve una ruta propia.
 */
export default function MarcaClub({
  nombre,
  logoSrc,
  tamanio = 'md',
}: {
  nombre: string;
  /** `/api/clubes/<slug>/logo?v=…`, o `null` si el club no tiene logo. */
  logoSrc: string | null;
  tamanio?: keyof typeof TAMANIO;
}) {
  const t = TAMANIO[tamanio];
  return (
    <span data-marca-club="" className="flex min-w-0 items-center gap-3">
      <span
        className={`flex shrink-0 items-center justify-center overflow-hidden bg-white shadow-sm ${t.chip}`}
      >
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- ver comentario del componente
          <img src={logoSrc} alt="" data-logo-club="" className="h-full w-full object-contain" />
        ) : (
          <span
            aria-hidden
            data-iniciales-club=""
            className={`font-[family-name:var(--font-oswald)] font-bold leading-none text-primario ${t.iniciales}`}
          >
            {inicialesDelClub(nombre)}
          </span>
        )}
      </span>
      <span
        className={`min-w-0 font-[family-name:var(--font-oswald)] font-semibold uppercase leading-tight tracking-wide ${t.nombre}`}
      >
        {nombre}
      </span>
    </span>
  );
}
