import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AuthLayout from '../layout';

describe('AuthLayout', () => {
  it('renders children', () => {
    render(<AuthLayout><div>test child</div></AuthLayout>);
    expect(screen.getByText('test child')).toBeInTheDocument();
  });

  it('renders BioTeam heading', () => {
    render(<AuthLayout><div /></AuthLayout>);
    expect(screen.getByText('BioTeam')).toBeInTheDocument();
  });

  it('renders the BioTeam icon (inverse variant, decorative) next to the wordmark', () => {
    const { container } = render(<AuthLayout><div /></AuthLayout>);
    const icono = container.querySelector('img[data-logo-bioteam]');
    expect(icono).toHaveAttribute('data-logo-bioteam', 'inverso');
    expect(icono).toHaveAttribute('alt', '');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('does not render any club name', () => {
    const { container } = render(<AuthLayout><div /></AuthLayout>);
    expect(container.textContent).not.toMatch(/gimnasia y esgrima/i);
  });
});
