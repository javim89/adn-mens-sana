import { OSWALD } from '../_lib/acentos';

/**
 * El bloque de fecha de un tile: una línea chica en mayúsculas ("MIÉ 30/9") y una
 * grande en Oswald (la hora, o el día).
 *
 * El fondo es navy por defecto; los llamadores pasan el del acento del módulo o el
 * ámbar de una cita vencida. Fondo y texto van juntos para que el contraste lo decida
 * quien elige el color (blanco sobre navy/600, ámbar 900 sobre ámbar 100).
 *
 * `min-w-*` + `whitespace-nowrap` y no un ancho fijo: "MIÉ 30/9" tiene que quedar en
 * UNA línea como en la referencia; con `w-20` partía en dos. `opacity-90` y no 80 en la
 * línea chica: sobre violeta-600 el blanco al 80% bajaba de 4.5:1.
 */
export default function TileFecha({
  arriba,
  abajo,
  fondo = 'bg-[#121A61]',
  texto = 'text-white',
  tamano = 'normal',
}: {
  arriba: string;
  abajo: string;
  /** Clase LITERAL de fondo. */
  fondo?: string;
  /** Clase LITERAL de texto, a juego con el fondo. */
  texto?: string;
  tamano?: 'normal' | 'grande';
}) {
  const grande = tamano === 'grande';
  return (
    <div
      className={`flex shrink-0 flex-col items-center justify-center rounded-xl text-center ${fondo} ${texto} ${grande ? 'min-w-24 px-2.5 py-3' : 'min-w-20 px-2.5 py-2.5'}`}
    >
      <span className="whitespace-nowrap text-[11px] font-semibold uppercase leading-tight tracking-wider opacity-90">
        {arriba}
      </span>
      <span
        className={`mt-0.5 font-semibold leading-none tabular-nums ${grande ? 'text-3xl' : 'text-2xl'}`}
        style={OSWALD}
      >
        {abajo}
      </span>
    </div>
  );
}
