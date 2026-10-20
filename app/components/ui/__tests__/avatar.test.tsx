import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { Avatar } from '../avatar';

describe('Avatar', () => {
  test('muestra la imagen cuando hay src', () => {
    render(<Avatar src="https://s3.example/foto.jpg" alt="García, Juan" iniciales="JG" />);
    expect(screen.getByRole('img', { name: 'García, Juan' })).toHaveAttribute('src', 'https://s3.example/foto.jpg');
    expect(screen.queryByText('JG')).not.toBeInTheDocument();
  });

  test('sin src muestra las iniciales', () => {
    render(<Avatar src={null} alt="García, Juan" iniciales="JG" />);
    expect(screen.getByText('JG')).toBeInTheDocument();
  });

  test('si la imagen falla cae a las iniciales', () => {
    render(<Avatar src="https://s3.example/vencida.jpg" alt="García, Juan" iniciales="JG" />);
    fireEvent.error(screen.getByRole('img', { name: 'García, Juan' }));
    expect(screen.getByText('JG')).toBeInTheDocument();
  });
});
