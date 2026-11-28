import { Panel } from '@/app/components/ui/panel';
import { NIVEL_TRIAGE_LABELS } from '@/lib/utils/enum-labels';
import type { DistribucionTriage } from '@/lib/queries/triage';
import BarraApilada from '../../dashboard/_components/BarraApilada';
import MiniCardsNivel from '../../dashboard/_components/MiniCardsNivel';
import { NIVEL_ESTILO, NIVELES } from '../../dashboard/_components/TriageDistribucion';
import { linkTriage, SIN_CALCULAR } from '../../dashboard/_lib/links';

/**
 * Columna derecha del listado: cómo se reparte el triage del plantel activo. Cada
 * mini-card linkea al mismo listado filtrado por su nivel (con `estado=ACTIVO`, el
 * criterio con el que contó la query).
 */
export default function DistribucionTriagePanel({ datos }: { datos: DistribucionTriage }) {
  const { actual, sinCalcular, totalActivos } = datos;

  if (totalActivos === 0) {
    return (
      <Panel titulo="Distribución de triage">
        <p className="text-sm text-muted-foreground">Todavía no hay deportistas activos.</p>
      </Panel>
    );
  }

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
      claseTexto: 'text-foreground',
      punto: 'bg-gray-400',
      tinte: 'bg-gray-100',
      href: linkTriage(SIN_CALCULAR),
    },
  ];

  return (
    <Panel titulo="Distribución de triage">
      <p className="-mt-1 mb-3 text-xs text-muted-foreground">
        Sobre {totalActivos} deportistas activos.
      </p>
      <BarraApilada segmentos={segmentos} total={totalActivos} grosor="fina" />
      <div className="mt-4">
        <MiniCardsNivel
          total={totalActivos}
          columnas={2}
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
    </Panel>
  );
}
