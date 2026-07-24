import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { AntropometriaSection } from '../_components/sections/AntropometriaSection';
import type { SeguimientoExtendedFormValues } from '../_components/SeguimientoForm';

function Host() {
  const {
    register,
    watch,
    formState: { errors },
  } = useForm<SeguimientoExtendedFormValues>();
  return <AntropometriaSection register={register} watch={watch} errors={errors} />;
}

function findSumatoriaValue(label: string): HTMLElement {
  // Card structure: <div><div>...label...auto</div><p>value</p></div>
  const labelEl = screen.getByText(label);
  const card = labelEl.closest('div')?.parentElement as HTMLElement;
  return card.querySelector('p') as HTMLElement;
}

const EDITABLE_IDS = [
  'antropometria_peso',
  'antropometria_talla',
  'antropometria_tsen',
  'antropometria_perimetroBrazo',
  'antropometria_perimetroMusloMedio',
  'antropometria_perimetroPantorrilla',
  'antropometria_cinturaMinima',
  'antropometria_caderaMaxima',
  'antropometria_pliegueTriceps',
  'antropometria_pliegueSubescapular',
  'antropometria_pliegueSupraespinal',
  'antropometria_pliegueAbdominal',
  'antropometria_pliegueMuslo',
  'antropometria_plieguePantorrilla',
];

describe('AntropometriaSection', () => {
  test('renderiza los 13 inputs editables y las 2 sumatorias', () => {
    render(<Host />);
    for (const id of EDITABLE_IDS) {
      expect(document.getElementById(id)).toBeTruthy();
    }
    expect(screen.getByText('IMC')).toBeTruthy();
    expect(screen.getByText('Sumatoria de Pliegues')).toBeTruthy();
  });

  test('las sumatorias arrancan vacías con guion', () => {
    render(<Host />);
    expect(findSumatoriaValue('IMC').textContent).toContain('—');
    expect(findSumatoriaValue('Sumatoria de Pliegues').textContent).toContain('—');
  });

  test('al escribir peso y talla se calcula el IMC en vivo', async () => {
    const user = userEvent.setup();
    render(<Host />);
    await user.type(document.getElementById('antropometria_peso')!, '70');
    await user.type(document.getElementById('antropometria_talla')!, '175');
    // IMC = 70 / (1.75^2) = 22.857 -> 22.9
    expect(findSumatoriaValue('IMC').textContent).toContain('22.9');
  });

  test('al escribir pliegues se actualiza la Sumatoria de Pliegues', async () => {
    const user = userEvent.setup();
    render(<Host />);
    await user.type(document.getElementById('antropometria_pliegueTriceps')!, '10');
    await user.type(document.getElementById('antropometria_pliegueSubescapular')!, '5');
    // 10 + 5 = 15
    expect(findSumatoriaValue('Sumatoria de Pliegues').textContent).toContain('15');
  });

  test('las sumatorias no son inputs editables', () => {
    render(<Host />);
    // No hay input registrado para imc ni sumatoria
    expect(document.getElementById('antropometria_imc')).toBeNull();
    expect(document.getElementById('antropometria_sumatoriaPliegues')).toBeNull();
    const imcValue = findSumatoriaValue('IMC');
    expect(imcValue.tagName).toBe('P');
  });
});
