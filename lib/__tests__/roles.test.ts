import { describe, test, expect } from 'vitest';
import { getNavItemsForRole, ROLES_PERMITIDOS } from '../roles';

describe('getNavItemsForRole — /insights es exclusivo de admin', () => {
  test('admin ve /insights', () => {
    const items = getNavItemsForRole('admin').map((i) => i.href);
    expect(items).toContain('/insights');
  });

  // NAV_BY_ROLE define los roles por exclusión, así que un item nuevo entra
  // por defecto para todos. Este test recorre TODOS los roles no-admin para
  // que agregar una ruta admin-only sin sumarla a ADMIN_ONLY falle acá.
  test.each(ROLES_PERMITIDOS.filter((r) => r !== 'admin'))(
    'el rol %s NO ve /insights',
    (rol) => {
      const items = getNavItemsForRole(rol).map((i) => i.href);
      expect(items).not.toContain('/insights');
    },
  );

  test('un rol desconocido o ausente no ve /insights', () => {
    expect(getNavItemsForRole(undefined).map((i) => i.href)).not.toContain('/insights');
    expect(getNavItemsForRole(null).map((i) => i.href)).not.toContain('/insights');
    expect(getNavItemsForRole('cualquier-cosa').map((i) => i.href)).not.toContain('/insights');
  });
});

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

describe('getNavItemsForRole — /viandas es allowlist: admin + responsable_viandas', () => {
  test.each(['admin', 'responsable_viandas'] as const)('el rol %s ve /viandas', (rol) => {
    expect(getNavItemsForRole(rol).map((i) => i.href)).toContain('/viandas');
  });

  // ROUTE_ROLES es una allowlist, pero NAV_BY_ROLE_BASE sigue siendo por
  // exclusión: si alguien agrega un rol nuevo y se olvida de /viandas, el item
  // se le colaría. Este test.each recorre TODOS los roles ajenos al módulo para
  // que ese olvido falle acá.
  test.each(
    ROLES_PERMITIDOS.filter((r) => r !== 'admin' && r !== 'responsable_viandas'),
  )('el rol %s NO ve /viandas', (rol) => {
    expect(getNavItemsForRole(rol).map((i) => i.href)).not.toContain('/viandas');
  });

  // toEqual y no toContain: el responsable de viandas no tiene por qué ver nada
  // más que su módulo, y /dashboard solo porque app/(app)/page.tsx redirige ahí.
  test('responsable_viandas ve exactamente dashboard y viandas', () => {
    expect(getNavItemsForRole('responsable_viandas').map((i) => i.href)).toEqual([
      '/dashboard',
      '/viandas',
    ]);
  });

  test('un rol desconocido o ausente no ve /viandas', () => {
    expect(getNavItemsForRole(undefined).map((i) => i.href)).not.toContain('/viandas');
    expect(getNavItemsForRole(null).map((i) => i.href)).not.toContain('/viandas');
    expect(getNavItemsForRole('cualquier-cosa').map((i) => i.href)).not.toContain('/viandas');
  });
});

describe('getNavItemsForRole — /usuarios sigue siendo admin-only tras extraer ADMIN_ONLY', () => {
  test.each(ROLES_PERMITIDOS.filter((r) => r !== 'admin'))(
    'el rol %s NO ve /usuarios',
    (rol) => {
      expect(getNavItemsForRole(rol).map((i) => i.href)).not.toContain('/usuarios');
    },
  );

  test('admin sigue viendo /usuarios', () => {
    expect(getNavItemsForRole('admin').map((i) => i.href)).toContain('/usuarios');
  });
});
