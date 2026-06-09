import { test, expect } from '@playwright/test';

/**
 * Sidebar nav-items smoke test.
 *
 * Verifies that the sidebar renders for an authenticated session
 * and all expected nav links are visible.
 *
 * NOTE: /dashboard is protected by Clerk middleware. Without a valid Clerk
 * test user session, the middleware redirects to /sign-in. These tests are
 * skipped until Clerk test-mode fixtures (storageState / session cookies)
 * are configured in the Playwright project setup.
 *
 * To enable: provision a Clerk test user with publicMetadata.role = 'admin'
 * and inject the session cookie via `storageState` in playwright.config.ts.
 */

test.describe('Sidebar nav items (authenticated admin)', () => {
  test.skip(
    'sidebar renders navigation and all admin nav items are visible',
    async ({ page }) => {
      await page.goto('/dashboard');
      // Sidebar <aside> must be present
      await expect(page.getByRole('navigation')).toBeVisible();
      // All four admin nav items
      await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Deportistas' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Turnos' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Usuarios' })).toBeVisible();
    }
  );
});
