import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MarcaClub from '../MarcaClub';

describe('MarcaClub', () => {
  it('con logo: chip con el logo decorativo y el nombre como texto', () => {
    const { container } = render(<MarcaClub nombre="Club de Gimnasia y Esgrima La Plata" logoSrc="/api/clubes/g/logo?v=1" />);
    const img = container.querySelector('img[data-logo-club]');
    expect(img).toHaveAttribute('src', '/api/clubes/g/logo?v=1');
    expect(img).toHaveAttribute('alt', '');
    expect(screen.getByText('Club de Gimnasia y Esgrima La Plata')).toBeInTheDocument();
    expect(container.querySelector('[data-iniciales-club]')).toBeNull();
  });

  it('sin logo: las iniciales, ocultas al lector de pantalla', () => {
    const { container } = render(<MarcaClub nombre="Club de Gimnasia y Esgrima La Plata" logoSrc={null} />);
    expect(container.querySelector('img')).toBeNull();
    const iniciales = container.querySelector('[data-iniciales-club]');
    expect(iniciales).toHaveTextContent('GE');
    expect(iniciales).toHaveAttribute('aria-hidden');
  });

  it('el nombre del club es el nombre accesible del bloque', () => {
    const { container } = render(<MarcaClub nombre="River Plate" logoSrc={null} />);
    expect(container.textContent).toBe('RPRiver Plate');
    expect(screen.getByText('River Plate')).toBeVisible();
  });
});
