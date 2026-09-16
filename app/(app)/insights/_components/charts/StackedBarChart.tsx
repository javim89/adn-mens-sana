'use client';

import { BarChartBase } from './BarChart';
import type { ChartProps } from './types';

export default function StackedBarChart(props: ChartProps) {
  return <BarChartBase {...props} variant="stacked" />;
}
