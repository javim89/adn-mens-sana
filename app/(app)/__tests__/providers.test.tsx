import { useEffect } from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import Providers from '../providers';

let actual: QueryClient | null = null;
function Espia() {
  const client = useQueryClient();
  useEffect(() => {
    actual = client;
  }, [client]);
  return null;
}

describe('Providers', () => {
  it('cambiar de club descarta la caché del club anterior', () => {
    const { rerender } = render(
      <Providers clubId="club_a">
        <Espia />
      </Providers>,
    );
    const delA = actual!;
    delA.setQueryData(['disciplinas'], ['Fútbol del club A']);

    rerender(
      <Providers clubId="club_b">
        <Espia />
      </Providers>,
    );

    expect(actual).not.toBe(delA);
    expect(actual!.getQueryData(['disciplinas'])).toBeUndefined();
  });

  it('sin cambio de club conserva el mismo cliente', () => {
    const { rerender } = render(
      <Providers clubId="club_a">
        <Espia />
      </Providers>,
    );
    const primero = actual;
    rerender(
      <Providers clubId="club_a">
        <Espia />
      </Providers>,
    );
    expect(actual).toBe(primero);
  });
});
