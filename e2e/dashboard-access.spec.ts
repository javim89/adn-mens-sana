import { test, expect } from '@playwright/test';

/**
 * Control de acceso del Dashboard — SIN sesión.
 *
 * Es el spec del dashboard que corre de verdad hoy: no necesita un usuario de Clerk,
 * así que no depende del `storageState` que el proyecto todavía no tiene configurado
 * (ver `e2e/dashboard.spec.ts`). Mismo patrón que `e2e/viandas-access.spec.ts`.
 *
 * Lo que verifica: `proxy.ts` exige sesión para todo lo que no sea /sign-in ni
 * /sign-up. El gating por ROL vive DENTRO de `app/(app)/dashboard/page.tsx` (las
 * queries de las cards que un rol no ve no se ejecutan) y está cubierto por
 * `app/(app)/dashboard/__tests__/page.test.tsx`.
 *
 * **Por qué `/dashboard` no lleva guard de rol y sí un gating interno:** es el destino
 * de todos los `redirect('/dashboard')` y el fallback de `getNavItemsForRole`, así que
 * un guard de ruta dejaría a algún rol sin ninguna pantalla alcanzable.
 */
test.describe('Dashboard — acceso sin sesión', () => {
  test('/dashboard redirige a /sign-in', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/dashboard');
    await page.waitForURL('**/sign-in**');

    expect(new URL(page.url()).pathname).toBe('/sign-in');
  });

  // El dashboard no lee query params, pero que no abran una puerta lateral en el proxy
  // es lo mismo que se verifica en viandas.
  test('los query params no saltean el proxy', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/dashboard?rol=admin&semana=2020-01-01');
    await page.waitForURL('**/sign-in**');

    expect(new URL(page.url()).pathname).toBe('/sign-in');
  });

  /**
   * LO ESENCIAL DE ESTE SPEC: el dashboard es la pantalla que más conteos agregados
   * concentra (triage, viandas, presentismo, plantel). Si el RSC llegara a ejecutarse
   * sin sesión, esos números viajarían en el HTML aunque después la UI redirija.
   *
   * Se asertan los rótulos y no los números: un "0" o un "5" aparecen en cualquier
   * página por casualidad, mientras que "Deportistas activos en rojo" solo existe acá.
   */
  test('sin sesión el HTML no filtra ningún conteo del club', async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.goto('/dashboard');

    expect(res?.status()).toBeLessThan(500);

    const html = (await res?.text()) ?? '';
    for (const rotulo of [
      'Deportistas activos en rojo',
      'Distribución de triage',
      'Sin calcular',
      'Viandas entregadas esta semana',
      'Entregas fuera de ficha',
      'Turnos de esta semana',
      'Presentismo de esta semana',
      'Ausencias reiteradas',
      'Seguimientos urgentes',
      'Próximas citas',
      'Plantel',
      'Próximos eventos',
      // Rótulos del rediseño visual: solo existen en el dashboard.
      'Backlog por prioridad',
      'Backlog abierto',
      'Deportistas en el plantel',
      'Próximos turnos',
      'Próximo partido',
      'REVISAR',
      'Riesgo del plantel activo',
      // Prefijos de los aria-labels con conteo de las mini-cards: llevan el número adentro.
      'Ver deportistas activos en nivel',
      'Ver los seguimientos con prioridad',
      'Ver los deportistas con estado',
    ]) {
      expect(html, `el HTML no debería contener "${rotulo}"`).not.toContain(rotulo);
    }
  });

  /**
   * Ni un nombre de deportista. Las listas inline (ausencias reiteradas, próximas
   * citas, próximos turnos) muestran nombres y apellidos, que es dato personal.
   */
  test('sin sesión no se filtra ninguna lista con nombres', async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.goto('/dashboard');

    const html = (await res?.text()) ?? '';
    expect(html).not.toContain('ausencias');
    expect(html).not.toContain('ya pasó');
    expect(html).not.toContain('sin convocatoria');
    // Los aria-labels de los tiles llevan el nombre del deportista o del seguimiento.
    expect(html).not.toContain('Ver la ficha de');
    expect(html).not.toContain('Ver el seguimiento');
    expect(html).not.toContain(' vs. ');
  });

  // El estado vacío de "sin rol asignado" también es contenido de la app: sin sesión
  // no se llega ni a eso.
  test('sin sesión tampoco se ve el estado de "sin rol asignado"', async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.goto('/dashboard');

    const html = (await res?.text()) ?? '';
    expect(html).not.toContain('todavía no tiene un rol asignado');
  });
});
