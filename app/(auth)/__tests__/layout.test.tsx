import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AuthLayout from '../layout';
import { TEMA_NEUTRO } from '@/lib/branding/tokens';

describe('AuthLayout (login genérico)', () => {
  it('renders children', () => {
    render(<AuthLayout><div>test child</div></AuthLayout>);
    expect(screen.getByText('test child')).toBeInTheDocument();
  });

  it('es neutro: sin la marca de BioTeam ni la de un club', () => {
    const { container } = render(<AuthLayout><div /></AuthLayout>);
    expect(container.textContent).not.toMatch(/bioteam/i);
    expect(container.textContent).not.toMatch(/gimnasia y esgrima/i);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Ingresá a tu club' })).toBeInTheDocument();
  });

  it('aplica el tema neutro', () => {
    const { container } = render(<AuthLayout><div /></AuthLayout>);
    expect(container.querySelector('style[data-tema-club]')?.textContent).toContain(
      `--club-primario:${TEMA_NEUTRO.primario};`,
    );
  });
});
