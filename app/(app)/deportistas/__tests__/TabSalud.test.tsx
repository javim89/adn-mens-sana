import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import TabSalud from '../_components/tabs/TabSalud';
import type { DeportistaFormData } from '@/lib/types/deportistas';

// TabSalud uses its own MultiSelectDropdown — no Radix/shadcn mocks needed.

const emptyData: DeportistaFormData = {
  apellido: '',
  nombre: '',
  dni: '',
  fechaNacimiento: '',
  vivePensionClub: false,
  vivePensionExterna: false,
  estado: 'ACTIVO',
  esRepresentante: false,
  clubesAnteriores: [],
};

describe('TabSalud', () => {
  // 1 — Renderiza sin errores con data vacío
  test('renderiza sin errores con data vacío', () => {
    render(<TabSalud data={emptyData} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/grupo y factor sanguíneo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/horas de sueño promedio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/obra social/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/antecedentes quirúrgicos/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/medicación/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/historial de lesiones/i)).toBeInTheDocument();
  });

  // 2 — Trigger de enfermedades muestra placeholder cuando no hay selección
  test('trigger de enfermedades muestra "Seleccionar..." cuando no hay selección', () => {
    render(<TabSalud data={emptyData} onChange={vi.fn()} />);
    expect(screen.getByText('Seleccionar enfermedades...')).toBeInTheDocument();
  });

  // 3 — Click en trigger abre el dropdown (se ven las opciones)
  test('click en trigger de enfermedades abre el dropdown con opciones', () => {
    render(<TabSalud data={emptyData} onChange={vi.fn()} />);
    const trigger = screen.getByText('Seleccionar enfermedades...');
    fireEvent.click(trigger);
    // The dropdown renders enum options; Asma and Diabetes should now be visible
    expect(screen.getByRole('checkbox', { name: /^asma$/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /^diabetes$/i })).toBeInTheDocument();
  });

  // 4 — Click en checkbox llama a onChange con el valor en datosSalud.enfermedadesPreexistentes
  test('click en checkbox llama a onChange con el valor correcto en enfermedadesPreexistentes', () => {
    const onChange = vi.fn();
    render(<TabSalud data={emptyData} onChange={onChange} />);
    // Open the enfermedades dropdown
    fireEvent.click(screen.getByText('Seleccionar enfermedades...'));
    // Click the Asma checkbox
    fireEvent.click(screen.getByRole('checkbox', { name: /^asma$/i }));
    expect(onChange).toHaveBeenCalledWith({
      datosSalud: {
        enfermedadesPreexistentes: ['ASMA'],
        antecedentesEnfermedadesFam: [],
      },
    });
  });

  // 5 — Click en "Sí" de muerte súbita llama a onChange con antecedenteMuerteSubitaFamiliar: true
  test('click en "Sí" de muerte súbita llama a onChange con antecedenteMuerteSubitaFamiliar: true', () => {
    const onChange = vi.fn();
    render(<TabSalud data={emptyData} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /^sí$/i }));
    expect(onChange).toHaveBeenCalledWith({
      datosSalud: {
        enfermedadesPreexistentes: [],
        antecedentesEnfermedadesFam: [],
        antecedenteMuerteSubitaFamiliar: true,
      },
    });
  });

  // 6 — Click en "No" de muerte súbita llama a onChange con antecedenteMuerteSubitaFamiliar: false
  test('click en "No" de muerte súbita llama a onChange con antecedenteMuerteSubitaFamiliar: false', () => {
    const onChange = vi.fn();
    render(<TabSalud data={emptyData} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /^no$/i }));
    expect(onChange).toHaveBeenCalledWith({
      datosSalud: {
        enfermedadesPreexistentes: [],
        antecedentesEnfermedadesFam: [],
        antecedenteMuerteSubitaFamiliar: false,
      },
    });
  });

  // 7 — Cuando hay ítems seleccionados, se muestran los badges con botón ×
  test('cuando hay ítems seleccionados se muestran los badges con botón ×', () => {
    const dataWithSelection: DeportistaFormData = {
      ...emptyData,
      datosSalud: {
        enfermedadesPreexistentes: ['ASMA'],
        antecedentesEnfermedadesFam: [],
      },
    };
    render(<TabSalud data={dataWithSelection} onChange={vi.fn()} />);
    // The trigger now shows the label "Asma"; the badge also shows "Asma"
    // At least one × button must be present (the badge remove button)
    const removeButtons = screen.getAllByText('×');
    expect(removeButtons.length).toBeGreaterThanOrEqual(1);
  });

  // 8 — Click en × de un badge elimina ese ítem de la selección
  test('click en × de un badge elimina ese ítem de la selección', () => {
    const onChange = vi.fn();
    const dataWithTwoSelections: DeportistaFormData = {
      ...emptyData,
      datosSalud: {
        enfermedadesPreexistentes: ['ASMA', 'DIABETES'],
        antecedentesEnfermedadesFam: [],
      },
    };
    render(<TabSalud data={dataWithTwoSelections} onChange={onChange} />);
    // Two badges: "Asma ×" and "Diabetes ×"
    const removeButtons = screen.getAllByText('×');
    expect(removeButtons.length).toBeGreaterThanOrEqual(2);
    // Click the first × (ASMA badge — order matches the selected array)
    fireEvent.click(removeButtons[0]);
    expect(onChange).toHaveBeenCalledWith({
      datosSalud: {
        enfermedadesPreexistentes: ['DIABETES'],
        antecedentesEnfermedadesFam: [],
      },
    });
  });
});
