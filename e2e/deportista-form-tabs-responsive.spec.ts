import { test, expect } from '@playwright/test';

/**
 * E2E — Deportista form tabs responsive fix (mobile 375px).
 *
 * Regression coverage for the layout bug where:
 *  1) the tab bar showed a phantom vertical scrollbar,
 *  2) the tabs overflowed on mobile without scroll-snap / fade / hidden scrollbar,
 *  3) each tab body produced horizontal scroll at <=375px.
 *
 * Like the rest of the deportistas E2E suite, these tests require an
 * authenticated Clerk session (storageState). They are skipped by default to
 * avoid false failures in CI until Testing Tokens + storageState are wired up
 * (see e2e/deportistas.spec.ts for the same guard).
 *
 * When enabled, run against viewport 375x667 (mobile) and assert zero
 * horizontal overflow on every tab body plus a working horizontal tab scroll.
 */

const TAB_LABELS = [
  'Datos Personales',
  'Datos Deportivos',
  'Datos Escolares',
  'Datos Sociales',
  'Salud',
] as const;

test.describe('Deportista form tabs — responsive (mobile 375px)', () => {
  test.skip(true, 'Requires Clerk test user session (storageState not configured)');

  test.use({ viewport: { width: 375, height: 667 } });

  test('the tab bar does not produce a phantom vertical scrollbar', async ({ page }) => {
    await page.goto('/deportistas/nuevo');
    const tablist = page.getByRole('tablist');
    await expect(tablist).toBeVisible();

    // The tab bar is a single row: its scrollHeight must not exceed its
    // clientHeight (no vertical overflow -> no phantom vertical scrollbar).
    const overflowsY = await tablist.evaluate(
      (el) => el.scrollHeight > el.clientHeight,
    );
    expect(overflowsY).toBe(false);
  });

  test('each tab body has no horizontal scroll at 375px', async ({ page }) => {
    await page.goto('/deportistas/nuevo');

    for (const label of TAB_LABELS) {
      const tab = page.getByRole('tab', { name: label });
      await tab.scrollIntoViewIfNeeded();
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true');

      // The document must not overflow horizontally on any tab.
      const overflowsX = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflowsX, `tab "${label}" overflows horizontally`).toBe(false);
    }
  });

  test('the tab bar scrolls horizontally and the last tab (Salud) is reachable', async ({ page }) => {
    await page.goto('/deportistas/nuevo');

    const saludTab = page.getByRole('tab', { name: 'Salud' });
    await saludTab.scrollIntoViewIfNeeded();
    await saludTab.click();
    await expect(saludTab).toHaveAttribute('aria-selected', 'true');

    // Salud content is shown (a representative field is visible).
    await expect(page.getByLabel(/grupo y factor sanguíneo/i)).toBeVisible();
  });

  test('switching tabs and submitting still works (no interaction regression)', async ({ page }) => {
    await page.goto('/deportistas/nuevo');

    // Move across tabs then back to Personal, fill required fields and submit.
    await page.getByRole('tab', { name: 'Datos Sociales' }).click();
    await page.getByRole('tab', { name: 'Datos Personales' }).click();

    await page.getByLabel(/apellido \*/i).fill('TabsResponsive');
    await page.getByLabel(/nombre \*/i).fill('E2E');
    await page.getByLabel(/dni \*/i).fill('12349876');
    await page.getByLabel(/fecha de nacimiento/i).fill('2001-05-10');

    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page).toHaveURL(/\/deportistas\/[a-z0-9]+$/);
  });
});
