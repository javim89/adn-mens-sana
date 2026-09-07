import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/triage/recompute', () => ({
  recomputeAll: vi.fn(),
}));

import { recomputeAll } from '@/lib/triage/recompute';
import { POST } from '../route';

const OLD_SECRET = process.env.CRON_SECRET;

describe('POST /api/cron/triage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'test-secret';
  });

  it('returns 401 without the secret', async () => {
    const res = await POST(new Request('http://localhost/api/cron/triage', { method: 'POST' }));
    expect(res.status).toBe(401);
    expect(recomputeAll).not.toHaveBeenCalled();
  });

  it('returns 401 with a wrong secret', async () => {
    const res = await POST(
      new Request('http://localhost/api/cron/triage', {
        method: 'POST',
        headers: { Authorization: 'Bearer nope' },
      }),
    );
    expect(res.status).toBe(401);
    expect(recomputeAll).not.toHaveBeenCalled();
  });

  it('returns 200 and the summary with a valid secret', async () => {
    vi.mocked(recomputeAll).mockResolvedValue({
      procesados: 2,
      byNivel: { VERDE: 1, AMARILLO: 1, NARANJA: 0, ROJO: 0 },
    });

    const res = await POST(
      new Request('http://localhost/api/cron/triage', {
        method: 'POST',
        headers: { Authorization: 'Bearer test-secret' },
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.procesados).toBe(2);
    expect(body.byNivel.VERDE).toBe(1);
    expect(recomputeAll).toHaveBeenCalledTimes(1);
  });

  afterEach(() => {
    process.env.CRON_SECRET = OLD_SECRET;
  });
});
