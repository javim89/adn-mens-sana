import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TriagePanel from '../TriagePanel';
import type { TriageContribucion } from '@/lib/types/triage';

const recomputeTriageAction = vi.fn();

vi.mock('@/lib/actions/triage', () => ({
  recomputeTriageAction: (...args: unknown[]) => recomputeTriageAction(...args),
}));

const desglose: TriageContribucion[] = [
  { area: 'MEDICA', regla: 'Lesión activa reciente', puntos: 3 },
  { area: 'MEDICA', regla: 'Sin obra social', puntos: 2 },
  { area: 'SOCIAL', regla: 'Vive en pensión externa', puntos: 2 },
];

describe('TriagePanel', () => {
  beforeEach(() => {
    recomputeTriageAction.mockReset();
    recomputeTriageAction.mockResolvedValue({ success: true });
  });

  test('renderiza el nivel ROJO, el puntaje total y el desglose agrupado por área', () => {
    render(
      <TriagePanel
        triage={{
          nivel: 'ROJO',
          puntajeTotal: 7,
          desglose,
          calculatedAt: '2026-09-01T10:00:00.000Z',
        }}
        deportistaId="dep-1"
      />,
    );

    expect(screen.getByText('Rojo — Riesgo Alto')).toBeInTheDocument();
    expect(screen.getByText('Puntaje total: 7')).toBeInTheDocument();

    const medica = screen.getByText('Salud / Médica').closest('div');
    expect(medica).not.toBeNull();
    const medicaCard = medica!.parentElement as HTMLElement;
    expect(within(medicaCard).getByText('Lesión activa reciente')).toBeInTheDocument();
    expect(within(medicaCard).getByText('Sin obra social')).toBeInTheDocument();

    expect(screen.getByText('Social')).toBeInTheDocument();
    expect(screen.getByText('Vive en pensión externa')).toBeInTheDocument();
  });

  test('renderiza el estado vacío cuando triage es null', () => {
    render(<TriagePanel triage={null} deportistaId="dep-1" />);
    expect(screen.getByText('Sin triage calculado aún')).toBeInTheDocument();
  });

  test('el botón "Recalcular ahora" está presente y es clickeable', async () => {
    const user = userEvent.setup();
    render(<TriagePanel triage={null} deportistaId="dep-1" />);

    const button = screen.getByRole('button', { name: /Recalcular ahora/i });
    expect(button).toBeInTheDocument();

    await user.click(button);
    expect(recomputeTriageAction).toHaveBeenCalledWith('dep-1');
  });
});
