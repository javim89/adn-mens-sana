import { describe, test, expect } from 'vitest';
import { getNavItemsForRole } from '../roles';

describe('getNavItemsForRole — social', () => {
  const hrefs = () => getNavItemsForRole('social').map((i) => i.href);

  test('incluye /seguimientos', () => {
    expect(hrefs()).toContain('/seguimientos');
  });

  test('sigue incluyendo dashboard, deportistas y calendario', () => {
    const items = hrefs();
    expect(items).toContain('/dashboard');
    expect(items).toContain('/deportistas');
    expect(items).toContain('/calendario');
  });

  test('NO incluye /usuarios ni /turnos', () => {
    const items = hrefs();
    expect(items).not.toContain('/usuarios');
    expect(items).not.toContain('/turnos');
  });
});
