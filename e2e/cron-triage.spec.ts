import { test, expect } from '@playwright/test';

// Regresión: el middleware de Clerk cubre /(api|trpc)(.*) y respondía 307 a /sign-in
// antes de que el route handler corriera, así que la scheduled function de Netlify
// nunca recalculaba el triage. El endpoint debe llegar a su propio guard de CRON_SECRET.
test('POST /api/cron/triage no redirige a /sign-in sin sesión', async ({ request }) => {
  const res = await request.post('/api/cron/triage', {
    headers: { Authorization: 'Bearer secreto-invalido' },
    maxRedirects: 0,
    failOnStatusCode: false,
  });

  expect(res.status()).toBe(401);
  expect(res.headers()['location']).toBeUndefined();
  expect(await res.json()).toEqual({ error: 'No autorizado' });
});
