import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import {
  textoVariacion,
  tonoVariacion,
  type Sentido,
  type Variacion,
} from '../_lib/variacion';

const TONO_CLASS = {
  bueno: 'text-green-700',
  malo: 'text-red-700',
  neutro: 'text-[#6B7280]',
} as const;

/** Sobre el hero navy los tonos 700 no se leen: van los 300, y el gris pasa a blanco/70. */
const TONO_CLASS_OSCURO = {
  bueno: 'text-emerald-300',
  malo: 'text-rose-300',
  neutro: 'text-white/70',
} as const;

/**
 * La variación de una métrica respecto del período anterior.
 *
 * **La flecha sale de `direccion` y el color de `sentido`, y son dos cosas
 * distintas.** En triage subir es empeorar, así que la flecha hacia arriba va en
 * rojo; en presentismo, la misma flecha va en verde. Derivar el color de la
 * dirección es el bug de UX más fácil de cometer acá.
 *
 * Cuando no hay base, dice "sin comparación previa" en gris: con la base sin seed de
 * triage ése es el estado del día 1, y tiene que verse intencional, no como un dato
 * que falta.
 */
export default function VariacionBadge({
  variacion,
  sentido,
  sobreOscuro = false,
}: {
  variacion: Variacion;
  sentido: Sentido;
  sobreOscuro?: boolean;
}) {
  const tono = tonoVariacion(variacion, sentido);
  const sube =
    variacion.tipo === 'desde_cero' ||
    (variacion.tipo === 'delta' && variacion.direccion === 'sube');
  const Icono =
    variacion.tipo === 'sin_base' || variacion.tipo === 'sin_cambio'
      ? Minus
      : sube
        ? ArrowUp
        : ArrowDown;

  return (
    <p
      className={`flex items-center gap-1 text-xs font-medium ${(sobreOscuro ? TONO_CLASS_OSCURO : TONO_CLASS)[tono]}`}
    >
      <Icono size={14} aria-hidden className="shrink-0" />
      {textoVariacion(variacion)}
    </p>
  );
}
