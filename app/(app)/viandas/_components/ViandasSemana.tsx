import { Panel } from '@/app/components/ui/panel';
import type { ResumenViandas } from '@/lib/queries/dashboard';
import { COMIDAS } from '@/lib/utils/viandas';
import { TIPO_COMIDA_LABELS } from '@/lib/utils/enum-labels';
import BarrasCategoria from '../../dashboard/_components/BarrasCategoria';
import { ACENTOS } from '../../dashboard/_lib/acentos';
import { rangoSemana } from '../../dashboard/_lib/formato';

/** Columna derecha de `/viandas`: lo entregado en la semana, con el mismo alcance de lugar que el panel. */
export default function ViandasSemana({
  resumen,
  desdeClave,
  hastaClave,
  alcance,
}: {
  resumen: ResumenViandas;
  desdeClave: string;
  hastaClave: string;
  /** "Todos los lugares" o el lugar de retiro. */
  alcance: string;
}) {
  // La merienda en cero no aporta: la reciben solo algunas categorías.
  const comidas = COMIDAS.filter((c) => c !== 'MERIENDA' || resumen.porComida.MERIENDA.entregas > 0);

  return (
    <Panel titulo="Viandas entregadas">
      <p className="text-xs text-muted-foreground">
        Semana {rangoSemana(desdeClave, hastaClave)} · {alcance}
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        <span className="font-mono text-2xl font-semibold tabular-nums text-primario">
          {resumen.totalEntregas}
        </span>{' '}
        {resumen.totalEntregas === 1 ? 'entrega' : 'entregas'}
      </p>
      <div className="mt-4">
        <BarrasCategoria
          categorias={comidas.map((c) => ({
            clave: c,
            label: TIPO_COMIDA_LABELS[c],
            valor: resumen.porComida[c].entregas,
          }))}
          barraFuerte={ACENTOS.viandas.barraFuerte}
          barraSuave={ACENTOS.viandas.barraSuave}
        />
      </div>
      {resumen.totalFueraDeFicha > 0 && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          {resumen.totalFueraDeFicha} fuera de lo que prevé la ficha.
        </p>
      )}
    </Panel>
  );
}
