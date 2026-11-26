import { describe, expect, it } from 'vitest';
import { isCsrfOriginAllowed } from 'next/dist/server/app-render/csrf-protection';
import nextConfig from '../next.config';

describe('next.config: allowedDevOrigins', () => {
  const permitido = (host: string) => isCsrfOriginAllowed(host, nextConfig.allowedDevOrigins);

  it('permite el dominio raíz y los subdominios de club', () => {
    expect(permitido('bioteam.local')).toBe(true);
    expect(permitido('gimnasia-la-plata.bioteam.local')).toBe(true);
  });

  it('rechaza hosts ajenos', () => {
    expect(permitido('ajeno.example')).toBe(false);
    expect(permitido('bioteam.local.ajeno.example')).toBe(false);
  });
});
