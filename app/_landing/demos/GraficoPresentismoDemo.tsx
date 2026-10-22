'use client';

import dynamic from 'next/dynamic';
import { INSIGHTS_DEMO } from '../datos-demo';

/**
 * El `LineChart` real de Insights con el presentismo de ejemplo. Va con `ssr: false` para
 * que recharts no entre al JS inicial de `/`: se carga aparte, después de hidratar. El
 * placeholder ocupa el mismo alto (el del padre) para que no salte el layout.
 */
const LineChart = dynamic(() => import('../../(app)/insights/_components/charts/LineChart'), {
  ssr: false,
  loading: () => <div className="h-full rounded-lg bg-gray-50" />,
});

export default function GraficoPresentismoDemo() {
  return <LineChart {...INSIGHTS_DEMO} />;
}
