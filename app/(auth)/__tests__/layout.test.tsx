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

  it('does not render any club name', () => {
    const { container } = render(<AuthLayout><div /></AuthLayout>);
    expect(container.textContent).not.toMatch(/gimnasia y esgrima/i);
  });
});
