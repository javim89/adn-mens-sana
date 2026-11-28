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
  // Estructura: <div><div><svg/><span>label</span></div><p>valor</p></div>
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
    expect(screen.getByRole('group', { name: 'Cálculos automáticos' })).toBeTruthy();
    expect(screen.getByText('IMC')).toBeTruthy();
    expect(screen.getByText('Suma de pliegues')).toBeTruthy();
  });

  test('las sumatorias arrancan vacías con guion', () => {
    render(<Host />);
    expect(findSumatoriaValue('IMC').textContent).toContain('—');
    expect(findSumatoriaValue('Suma de pliegues').textContent).toContain('—');
  });

  test('al escribir peso y talla se calcula el IMC en vivo', async () => {
    const user = userEvent.setup();
    render(<Host />);
    await user.type(document.getElementById('antropometria_peso')!, '70');
    await user.type(document.getElementById('antropometria_talla')!, '175');
    // IMC = 70 / (1.75^2) = 22.857 -> 22.9
    expect(findSumatoriaValue('IMC').textContent).toContain('22.9');
  });

  test('al escribir pliegues se actualiza la Suma de pliegues', async () => {
    const user = userEvent.setup();
    render(<Host />);
    await user.type(document.getElementById('antropometria_pliegueTriceps')!, '10');
    await user.type(document.getElementById('antropometria_pliegueSubescapular')!, '5');
    // 10 + 5 = 15
    expect(findSumatoriaValue('Suma de pliegues').textContent).toContain('15');
  });

  test('las sumatorias no son inputs editables', () => {
    render(<Host />);
    // No hay input registrado para imc ni sumatoria
    expect(document.getElementById('antropometria_imc')).toBeNull();
    expect(document.getElementById('antropometria_sumatoriaPliegues')).toBeNull();
    const imcValue = findSumatoriaValue('IMC');
    expect(imcValue.tagName).toBe('P');
  });

  test('la unidad va adentro del input y forma parte del nombre accesible', () => {
    render(<Host />);
    expect(screen.getByLabelText('Peso (kg)')).toBe(document.getElementById('antropometria_peso'));
    expect(screen.getByLabelText('Tríceps (mm)')).toBe(
      document.getElementById('antropometria_pliegueTriceps'),
    );
    const contenedor = document.getElementById('antropometria_talla')!.parentElement!;
    expect(contenedor.textContent).toBe('cm');
  });

  test('medidas en grilla de 4 columnas desde sm', () => {
    render(<Host />);
    const grilla = document.getElementById('antropometria_peso')!.closest('div.grid')!;
    expect(grilla.className).toContain('sm:grid-cols-4');
  });
});
