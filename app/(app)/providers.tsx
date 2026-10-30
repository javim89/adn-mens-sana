'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * QueryClient de la app logueada, uno por club activo.
 *
 * Las query keys no llevan el club (`['disciplinas']`, `['insights-query', spec]`)
 * y el cambio de club es una navegación del lado del cliente: con un único
 * QueryClient, el club nuevo mostraría datos cacheados del anterior (las
 * disciplinas tienen `staleTime: Infinity`, y los dashboards de sistema tienen
 * los mismos specs en todos los clubes). Al cambiar `clubId` se arranca con un
 * cliente vacío, sin remontar la app.
 */
export default function Providers({ clubId, children }: { clubId: string; children: React.ReactNode }) {
  // El QueryClient se crea adentro del componente (no a nivel módulo) para no
  // compartir estado entre requests en SSR.
  const [estado, setEstado] = useState(() => ({ clubId, client: new QueryClient() }));
  if (estado.clubId !== clubId) {
    setEstado({ clubId, client: new QueryClient() });
  }

  return <QueryClientProvider client={estado.client}>{children}</QueryClientProvider>;
}
