import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AuthLayout from '../layout';

describe('AuthLayout', () => {
  it('renders children', () => {
    render(<AuthLayout><div>test child</div></AuthLayout>);
    expect(screen.getByText('test child')).toBeInTheDocument();
  });

  it('renders ADN-MENS-SANA heading', () => {
    render(<AuthLayout><div /></AuthLayout>);
    expect(screen.getByText('ADN-MENS-SANA')).toBeInTheDocument();
  });

  it('renders club subheading', () => {
    render(<AuthLayout><div /></AuthLayout>);
    expect(screen.getByText('Gimnasia y Esgrima de La Plata')).toBeInTheDocument();
  });
});
