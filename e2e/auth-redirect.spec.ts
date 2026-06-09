import { test, expect } from '@playwright/test';

test('unauthenticated access to protected route redirects to /sign-in with no query params', async ({ page }) => {
  // Ensure no session is active
  await page.context().clearCookies();

  await page.goto('/dashboard');

  // Wait for redirect to settle
  await page.waitForURL('**/sign-in**');

  const url = new URL(page.url());
  expect(url.pathname).toBe('/sign-in');
  expect(url.search).toBe('');
});
