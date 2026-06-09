import { test, expect } from '@playwright/test';

/**
 * Sidebar visibility on auth pages.
 *
 * The Sidebar lives exclusively in app/(app)/layout.tsx.
 * Routes under app/(auth)/ use a minimal layout that does NOT include it.
 */
test.describe('Sidebar en páginas de autenticación', () => {
  test('el Sidebar NO aparece en /sign-in', async ({ page }) => {
    await page.goto('/sign-in');
    // The aside element with the navy background is the Sidebar.
    // We check it is not present in the DOM.
    await expect(page.locator('aside')).not.toBeVisible();
  });

  test('el Sidebar NO aparece en /sign-up', async ({ page }) => {
    await page.goto('/sign-up');
    await expect(page.locator('aside')).not.toBeVisible();
  });
});

/**
 * Sidebar visibility on protected pages.
 *
 * NOTE: /dashboard is protected by Clerk middleware (proxy.ts).
 * In a local dev environment without a valid Clerk session, the user
 * is redirected to /sign-in — so the Sidebar will not appear on the
 * redirect target. This test verifies that behavior (redirect to sign-in,
 * which has no Sidebar) as a smoke test.
 *
 * For a full authenticated-user test, configure a Clerk test user with
 * CLERK_SECRET_KEY pointing to a test environment and inject a session
 * cookie before navigating.
 */
test.describe('Sidebar en páginas protegidas', () => {
  test('usuario no autenticado en /dashboard es redirigido a /sign-in (no Sidebar)', async ({ page }) => {
    await page.goto('/dashboard');
    // Without auth, middleware redirects to /sign-in
    await expect(page).toHaveURL(/sign-in/);
    await expect(page.locator('aside')).not.toBeVisible();
  });
});

/**
 * Sidebar nav items por rol.
 *
 * These tests require a pre-configured Clerk test user with publicMetadata.role
 * set for each role, plus a valid session injected via storageState or cookies.
 * Skipped until test users are provisioned in the Clerk test environment.
 */
test.describe('Sidebar nav items por rol (si factible en CI)', () => {
  test.skip('usuario con rol admin ve los ítems: Dashboard, Deportistas, Turnos, Usuarios', async ({ page }) => {
    // Requires: authenticated session for a user with publicMetadata.role = 'admin'
    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Deportistas' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Turnos' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Usuarios' })).toBeVisible();
  });

  test.skip('usuario con rol entrenador ve: Dashboard, Deportistas — NO ve Turnos ni Usuarios', async ({ page }) => {
    // Requires: authenticated session for a user with publicMetadata.role = 'entrenador'
    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Deportistas' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Turnos' })).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Usuarios' })).not.toBeVisible();
  });

  test.skip('usuario con rol medico ve: Dashboard, Deportistas, Turnos — NO ve Usuarios', async ({ page }) => {
    // Requires: authenticated session for a user with publicMetadata.role = 'medico'
    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Deportistas' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Turnos' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Usuarios' })).not.toBeVisible();
  });

  test.skip('usuario sin rol ve solo Dashboard (fallback)', async ({ page }) => {
    // Requires: authenticated session for a user with no role in publicMetadata
    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Deportistas' })).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Turnos' })).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Usuarios' })).not.toBeVisible();
  });
});
