import { NIVEL_TRIAGE_LABELS } from '@/lib/utils/enum-labels';
import type { NivelTriage } from '@/lib/generated/prisma/enums';
import type { DistribucionTriage } from '@/lib/queries/triage';
import { linkTriage, SIN_CALCULAR } from '../_lib/links';
import EstadoVacio, { CardSeccion } from './EstadoVacio';
import BarraApilada from './BarraApilada';
import MiniCardsNivel from './MiniCardsNivel';

/**
 * Colores de la BARRA (fondo sólido), no del badge. `NIVEL_TRIAGE_BADGE` es
 * `bg-*-100` + texto, pensado para una píldora; a un segmento de barra le hace falta
 * saturación para distinguirse del de al lado. Se mantiene la misma familia de tono
 * para que el verde de la barra y el del badge sean reconociblemente el mismo nivel.
 *
 * `texto` es el de la etiqueta "NN% en …" dentro del segmento. El blanco solo pasa AA
 * sobre `red-600` (4.8:1); sobre naranja-500 (2.8:1), verde-500 (2.3:1), amarillo y gris
 * no, así que esos llevan el tono 950 de su familia.
 */
const NIVEL_ESTILO: Record<NivelTriage, { barra: string; texto: string; tinte: string }> = {
  ROJO: { barra: 'bg-red-600', texto: 'text-white', tinte: 'bg-red-50' },
  NARANJA: { barra: 'bg-orange-500', texto: 'text-orange-950', tinte: 'bg-orange-50' },
  AMARILLO: { barra: 'bg-yellow-400', texto: 'text-yellow-950', tinte: 'bg-yellow-50' },
  VERDE: { barra: 'bg-green-500', texto: 'text-green-950', tinte: 'bg-green-50' },
};

/** Orden de lectura: del más grave al menos grave, y al final lo que falta calcular. */
const NIVELES: NivelTriage[] = ['ROJO', 'NARANJA', 'AMARILLO', 'VERDE'];

/**
 * Distribución de triage sobre el plantel activo.
 *
 * **El bucket "sin calcular" no es opcional.** Sin él, con la base sin seed de triage
 * la barra muestra 0/0/0/0 y esconde que hay ~250 deportistas sin snapshot, que es
 * justamente la información útil y accionable. Linkea a
 * `filter[nivelTriage]=SIN_CALCULAR`, que la API ya acepta.
 *
 * Cada mini-card linkea a su nivel con `filter[estado]=ACTIVO`, el mismo criterio con
 * el que la query contó: si el link y el número no coincidieran, la card mentiría.
 */
export default function TriageDistribucion({ datos }: { datos: DistribucionTriage }) {
  const { actual, sinCalcular, totalActivos } = datos;

  const segmentos = [
    ...NIVELES.map((nivel) => ({
      clave: nivel as string,
      label: NIVEL_TRIAGE_LABELS[nivel],
      cantidad: actual[nivel],
      clase: NIVEL_ESTILO[nivel].barra,
      claseTexto: NIVEL_ESTILO[nivel].texto,
      punto: NIVEL_ESTILO[nivel].barra,
      tinte: NIVEL_ESTILO[nivel].tinte,
      href: linkTriage(nivel),
    })),
    {
      clave: SIN_CALCULAR,
      label: 'Sin calcular',
      cantidad: sinCalcular,
      clase: 'bg-gray-300',
      claseTexto: 'text-[#1C1C1C]',
      punto: 'bg-gray-400',
      tinte: 'bg-gray-100',
      href: linkTriage(SIN_CALCULAR),
    },
  ];

  if (totalActivos === 0) {
    return (
      <CardSeccion titulo="Distribución de triage">
        <EstadoVacio
          titulo="Todavía no hay deportistas activos"
          detalle="Cuando se carguen fichas, acá se ve cómo se reparte el riesgo del plantel."
        />
      </CardSeccion>
    );
  }

  return (
    <CardSeccion
      titulo="Distribución de triage"
      descripcion={`Sobre ${totalActivos} deportistas activos.`}
    >
      {/* `totalActivos > 0` está garantizado por el early return de arriba, así que
          ningún porcentaje divide por cero. */}
      <BarraApilada
        segmentos={segmentos}
        total={totalActivos}
        etiquetaMayor={(s, pct) =>
          s.clave === SIN_CALCULAR ? `${pct}% sin calcular` : `${pct}% en ${s.label.toLowerCase()}`
        }
      />

      <div className="mt-4">
        <MiniCardsNivel
          total={totalActivos}
          items={segmentos.map((s) => ({
            clave: s.clave,
            label: s.label,
            cantidad: s.cantidad,
            href: s.href,
            ariaLabel: `Ver deportistas activos en nivel ${s.label} (${s.cantidad})`,
            punto: s.punto,
            tinte: s.tinte,
          }))}
        />
      </div>
    </CardSeccion>
  );
}
