import { Panel } from '@/app/components/ui/panel';
import { NIVEL_TRIAGE_LABELS } from '@/lib/utils/enum-labels';
import type { NivelTriage } from '@/lib/types/triage';

const NIVEL_CARD: Record<NivelTriage, { card: string; rotulo: string; texto: string }> = {
  ROJO: { card: 'border-red-200 bg-red-50', rotulo: 'text-red-800', texto: 'text-red-900' },
  NARANJA: { card: 'border-orange-200 bg-orange-50', rotulo: 'text-orange-800', texto: 'text-orange-900' },
  AMARILLO: { card: 'border-yellow-200 bg-yellow-50', rotulo: 'text-yellow-800', texto: 'text-yellow-900' },
  VERDE: { card: 'border-green-200 bg-green-50', rotulo: 'text-green-800', texto: 'text-green-900' },
};

export interface TriageResumen {
  nivel: NivelTriage;
  puntaje: number;
  motivos: string[];
}

function motivoTexto(motivos: string[]): string {
  if (motivos.length === 0) return 'Sin indicadores que sumen puntos en el último cálculo.';
  return `${motivos.join(' · ')}.`;
}

/**
 * Columna derecha de la ficha, igual en todas las pestañas: el nivel de triage con
 * sus motivos principales y el total de seguimientos del deportista.
 */
export default function FichaLateral({
  triage,
  seguimientosTotal,
  onVerTriage,
  onVerSeguimientos,
}: {
  triage: TriageResumen | null;
  seguimientosTotal: number;
  onVerTriage?: () => void;
  onVerSeguimientos?: () => void;
}) {
  const estilo = triage ? NIVEL_CARD[triage.nivel] : null;

  return (
    <>
      <section
        aria-labelledby="ficha-triage-titulo"
        data-nivel={triage?.nivel}
        className={`rounded-xl border p-4 ${estilo ? estilo.card : 'border-border bg-background'}`}
      >
        <h2
          id="ficha-triage-titulo"
          className={`text-xs font-semibold uppercase tracking-wide ${estilo ? estilo.rotulo : 'text-muted-foreground'}`}
        >
          Nivel de triage
        </h2>
        {triage && estilo ? (
          <>
            <p className={`mt-1 font-[family-name:var(--font-oswald)] text-2xl font-semibold ${estilo.rotulo}`}>
              {NIVEL_TRIAGE_LABELS[triage.nivel]}
            </p>
            <p className={`mt-1 text-xs ${estilo.texto}`}>{motivoTexto(triage.motivos)}</p>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Sin calcular todavía.</p>
        )}
        {onVerTriage && (
          <button
            type="button"
            onClick={onVerTriage}
            className="mt-2 text-xs font-semibold text-primario hover:underline"
          >
            Ver detalle
          </button>
        )}
      </section>

      <Panel>
        <p className="text-xs text-muted-foreground">Seguimientos</p>
        <p className="font-mono text-2xl font-semibold tabular-nums text-primario">{seguimientosTotal}</p>
        <p className="text-xs text-muted-foreground">
          {seguimientosTotal === 1 ? 'seguimiento registrado' : 'seguimientos registrados'}
        </p>
        {onVerSeguimientos && seguimientosTotal > 0 && (
          <button
            type="button"
            onClick={onVerSeguimientos}
            className="mt-2 text-xs font-semibold text-primario hover:underline"
          >
            Ver seguimientos
          </button>
        )}
      </Panel>
    </>
  );
}
