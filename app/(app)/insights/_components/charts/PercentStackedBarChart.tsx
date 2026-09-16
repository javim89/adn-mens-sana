'use client';

import { BarChartBase } from './BarChart';
import type { ChartProps } from './types';

export default function PercentStackedBarChart(props: ChartProps) {
  return <BarChartBase {...props} variant="percent" />;
}
